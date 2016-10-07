import http from 'http';
import clone from 'clone';
import async from 'async';

const getHXSEOContent = ( opts ) => {

  return ( files, metalsmith, done ) => {

    const getDataForPage = ( res, fileName, cb ) => {
      let data = '';
      res.on( 'data', d => {
        data += d;
      });
      const newFiles = [ ];
      res.on( 'end', ( ) => {
        data = JSON.parse( data );
        for ( let i = 0; i < data.length; i++ ) {
          let newFile = clone( files[ fileName ] );
          newFile.pageData = data[i];
          files[ data[i].pagename + '.html' ] = newFile;
          newFiles.push({
            data: newFile,
            key: data[i].pagename + '.html'
          });
        }
        delete files[ fileName ];
        cb( newFiles );
      });
    };

    const getExtraDataForPage = ( res, fileName, key, cb ) => {
      let data = '';
      res.on( 'data', d => {
        data += d;
      });
      res.on( 'end', ( ) => {
        data = JSON.parse( data );
        files[ fileName ][ key ] = data.product;
        cb( );
      });
    };

    const asyncGetQuery = ( request, option, currentFile, opt, extraCallBack ) => {
      if ( !currentFile.data.pageData[option[1]] ) return extraCallBack( );
      const value = currentFile.data.pageData[option[1]].split( ',' )[0];
      const requestOptions = {
        hostname: request.hostname,
        path: request.path.replace( option[0], value )
      };
      http.get( requestOptions, ( resExtra ) => {
        getExtraDataForPage( resExtra, currentFile.key, opt, extraCallBack );
      });
    };

    const callAPI = ( options, fileName, fileParams, callBack ) => {
      new Promise( resolve => {
        http.get( options, res => {
          getDataForPage( res, fileName, resolve );
        });
      }).then( data => {
        if ( !fileParams.hxseo.extras ) return callBack( );
        async.each( Object.keys( fileParams.hxseo.extras ), ( opt, extraCallBack ) => {
          if ( !fileParams.hxseo.extras[ opt ].path ) return extraCallBack( );
          const option = fileParams.hxseo.extras[ opt ].path.match( /<%([^%].*)%>/ );
          async.each( data, ( currentFile, cb ) => {
            asyncGetQuery( fileParams.hxseo.extras[ opt ], option, currentFile, opt, cb );
          }, ( ) => {
            extraCallBack( );
          });
        }, ( ) => {
          callBack( );
        });
      });
    };

    async.each( Object.keys( files ), ( fileName, callBack ) => {
      const fileParams = files[fileName];
      if ( !fileParams.hxseo ) return callBack( );
      const options = opts.url;
      options.path = fileParams.hxseo.query;
      return callAPI( options, fileName, fileParams, callBack );
    }, done );
  };
};

export default getHXSEOContent;
