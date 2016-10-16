import http from 'http';
import clone from 'clone';
import async from 'async';

const getHXSEOContent = ( opts ) => {

  return ( files, metalsmith, done ) => {

    const getDataForPage = ( res, fileName, cb, error ) => {
      let data = '';
      res.on( 'data', d => {
        data += d;
      });
      const newFiles = [ ];
      res.on( 'end', ( ) => {
        try {
          data = JSON.parse( data );
          if ( data.message ) return error( data.message );
          data = data.data;
        } catch ( e ) {
          return error( e );
        }
        for ( let i = 0; i < data.length; i++ ) {
          let newFile = clone( files[ fileName ] );
          newFile.pageData = data[i].attributes;
          const pageName = newFile.pageData.pageName;
          newFile.pagename = pageName + '.html';
          files[ newFile.pagename ] = newFile;
          newFiles.push({
            data: newFile,
            key: newFile.pagename
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
        try {
          data = JSON.parse( data );
          if ( Object.keys( data ).length === 1 ) data = data[Object.keys( data )[0]];
          files[ fileName ][ key ] = data;
          cb( );
        } catch ( e ) {
          cb( );
        }
      });
    };

    const asyncGetQuery = ( request, option, currentFile, opt, extraCallBack ) => {
      if ( !currentFile.data.pageData[option[1]] ) return extraCallBack( );
      let value = currentFile.data.pageData[option[1]];
      if ( value.indexOf( ',' )) value = value.replace( / /g, '' ); // Dont want spaces in array
      const requestOptions = {
        hostname: request.hostname,
        path: request.path.replace( option[0], value )
      };
      http.get( requestOptions, ( resExtra ) => {
        getExtraDataForPage( resExtra, currentFile.key, opt, extraCallBack );
      });
    };

    const callAPI = ( options, fileName, fileParams, callBack ) => {
      new Promise( ( resolve, reject ) => {
        http.get( options, res => {
          getDataForPage( res, fileName, resolve, reject );
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
      if ( options.token ) {
        options.path += options.path.indexOf( '?' ) > -1 ? '&' : '?';
        options.path += 'token=' + options.token;
      }
      return callAPI( options, fileName, fileParams, callBack );
    }, done );
  };
};

export default getHXSEOContent;
