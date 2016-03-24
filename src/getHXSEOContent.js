import http from 'http';
import clone from 'clone';
import async from 'async';

const getHXSEOContent = ( opts ) => {

  return ( files, metalsmith, done ) => {

    const getDataForPage = ( res, fileName, cb ) => {
      let data = '';
      res.on( 'data', ( d ) => {
        data += d;
      });
      res.on( 'end', ( ) => {
        data = JSON.parse( data );
        for ( let i = 0; i < data.length; i++ ) {
          let newFile = clone( files[ fileName ] );
          newFile.pageData = data[i];
          files[ data[i].pagename + '.html' ] = newFile;
        }
        delete files[ fileName ];
        cb( true );
      });
    };

    const callAPI = ( options, fileName, callBack ) => {
      new Promise( ( resolve ) => {
        http.get( options, ( res ) => {
          getDataForPage( res, fileName, resolve );
        });
      }).then( ( ) => {
        callBack( );
      });
    };

    async.each( Object.keys( files ), ( fileName, callBack ) => {
      const fileParams = files[fileName];
      if ( !fileParams.hxseo ) return callBack( );
      const options = opts.url;
      options.path = fileParams.hxseo.query;
      return callAPI( options, fileName, callBack );
    }, error => {
      done( error );
    });
  };
};

export default getHXSEOContent;
