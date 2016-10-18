import http from 'http';
import clone from 'clone';
import async from 'async';

const getHXSEOContent = ( opts ) => {

  return ( files, metalsmith, done ) => {

    // Make request to the API endpoint in the markdown file
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
          // Attach page data to props passed to the page
          newFile.pageData = data[i].attributes;
          const pageName = newFile.pageData.pageName;
          newFile.pagename = pageName + '.html';
          // Create the new page in metalsmith
          files[ newFile.pagename ] = newFile;
          newFiles.push({
            data: newFile,
            key: newFile.pagename
          });
        }
        // Remove the markdown file from metalsmith as its not an actual page
        delete files[ fileName ];
        cb( newFiles );
      });
    };

    // Make the request to the API on additional resource
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

    // Call the additional resource for each page returned and attach to page props
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

    // Call the API per markdown file and get data for each one returned.
    const callAPI = ( options, fileName, fileParams, callBack ) => {
      new Promise( ( resolve, reject ) => {
        // Need the API data back first thing
        http.get( options, res => {
          getDataForPage( res, fileName, resolve, reject );
        });
      }).then( data => {
        // Now check for additional requests per page returned from API call
        // This can be prodlib data based on an SEO object
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

    // Loop over all the markdown files and lookup the data for the API request
    async.each( Object.keys( files ), ( fileName, callBack ) => {
      const fileParams = files[fileName];
      if ( !fileParams.hxseo ) return callBack( );
      const options = opts.url;
      if ( !options.token ) return callBack( 'Must provide a token for SEO api access' );
      options.path = fileParams.hxseo.query;
      options.path += options.path.indexOf( '?' ) > -1 ? '&' : '?';
      options.path += 'token=' + options.token;
      return callAPI( options, fileName, fileParams, callBack );
    }, done );
  };
};

export default getHXSEOContent;
