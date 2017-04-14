import https from 'https';
import clone from 'clone';
import async from 'async';

const findreplace = {
  'haven-t': 'havent',
  'isn-t': 'isnt',
  'can-t': 'cant'
};
const regExp = new RegExp( '(' + Object.keys( findreplace ).map( word => {
  return word.replace( /[.?*+^$[\]\\(){}|-]/g, '\\$&');
}).join( '|' ) + ')', 'g' );
const regExpReplace = s => findreplace[s];

const pageNameChanger = ( pageName, fileParams ) => {
  if ( fileParams.postPageNameChange ) {
    if ( fileParams.postPageNameChange === 'strip' ) {
      pageName = pageName.split( '/' );
      pageName = pageName[pageName.length - 1].replace( /[\d]+/, '' );
      let pageNames = pageName.split( '-' );
      const start = pageNames[0] === '' ? 1 : 0;
      pageNames = pageNames.slice( start, pageNames.length );
      if ( pageNames[pageNames.length - 1] === '' ) {
        pageNames = pageNames.slice( 0, pageNames.length - 1 );
      }
      pageName = pageNames.join( '-' ).toLowerCase( ).replace( /--+/, '-' );
    }
  }
  return pageName;
};

const apiCaller = ( opts ) => {
  return ( files, metalsmith, done ) => {

    // Make request to the API endpoint in the markdown file
    const getDataForPage = ( res, fileName, fileParams, cb, error ) => {
      let data = '';
      res.on( 'data', d => {
        data += d;
      });
      const newFiles = [ ];
      res.on( 'end', ( ) => {
        try {
          data = JSON.parse( data );
          if ( fileParams.dataSource.repeater ) data = data[fileParams.dataSource.repeater];
        } catch ( e ) {
          return error( e );
        }
        for ( let i = 0; i < data.length; i++ ) {
          const newFile = clone( files[ fileName ] );
          let folder = fileName.split( '/' );
          folder = folder.length > 1 ? folder.slice( 0, -1 ).join( '/' ) + '/' : '';
          // Attach page data to props passed to the page
          newFile.pageData = data[i];
          let pageName = newFile.pageData[fileParams.dataSource.pageNameField];
          pageName = pageName.replace( regExp, regExpReplace );
          pageName = pageNameChanger( pageName, fileParams.dataSource );
          pageName = folder + pageName;
          newFile.pagename = newFile.pageName = pageName + '.html';
          // Create the new page in metalsmith
          files[ newFile.pageName ] = newFile;
          newFiles.push({
            data: newFile,
            key: newFile.pageName
          });
        }
        // Remove the markdown file from metalsmith as its not an actual page
        delete files[ fileName ];
        return cb( newFiles );
      });
    };

    // Make the request to the API on additional resource
    const getExtraDataForPage = ( res, fileName, key, fileParams, cb ) => {
      let data = '';
      res.on( 'data', d => {
        data += d;
      });
      res.on( 'end', ( ) => {
        try {
          data = JSON.parse( data );
          if ( fileParams.repeater ) data = data[fileParams.repeater];
        } catch ( e ) {
          return cb( );
        }
        for ( let i = 0; i < data.length; i++ ) {
          let folder = fileName.split( '/' );
          folder = folder.length > 1 ? folder.slice( 0, -1 ).join( '/' ) + '/' : '';
          // Attach page data to props passed to the page
          const pageData = data[i];
          let pageName = pageData[fileParams.pageNameField];
          pageName = pageName.replace( regExp, regExpReplace );
          pageName = pageNameChanger( pageName, fileParams );
          pageName = folder + pageName;
          pageData.pageName = pageName + '.html';
          data[i] = pageData;
        }
        files[ fileName ][ key ] = data;
        return cb( );
      });
    };

    // Call the additional resource for each page returned and attach to page props
    const asyncGetQuery = ( request, option, currentFile, opt, extraCallBack ) => {
      if ( !currentFile.data.pageData[option[1]] ) return extraCallBack( );
      let value = currentFile.data.pageData[option[1]];
      const requestOptions = {
        host: request.host,
        port: request.port || '443',
        headers: {
          accept: '*/*'
        }
      };
      requestOptions.path = request.query.replace( option[0], value );
      if ( opts.token && opts.token.name && opts.token.value ) {
        requestOptions.path += requestOptions.path.indexOf( '?' ) > -1 ? '&' : '?';
        requestOptions.path += opts.token.name + '=' + opts.token.value;
      }
      return https.get( requestOptions, ( resExtra ) => {
        getExtraDataForPage( resExtra, currentFile.key, opt, request, extraCallBack );
      });
    };

    // Call the API per markdown file and get data for each one returned.
    const callAPI = ( options, fileName, fileParams, callBack ) => {
      new Promise( ( resolve, reject ) => {
        https.get( options, res => {
          getDataForPage( res, fileName, fileParams, resolve, reject );
        });
      }).then( data => {
        // Now check for additional requests per page returned from API call
        // This can be prodlib data based on an SEO object
        if ( fileParams.dataSource.extras ) {
          async.each( Object.keys( fileParams.dataSource.extras ), ( opt, extraCallBack ) => {
            if ( fileParams.dataSource.extras[ opt ].query ) {
              const option = fileParams.dataSource.extras[ opt ].query.match( /<%([^%].*)%>/ );
              async.each( data, ( currentFile, cb ) => {
                asyncGetQuery( fileParams.dataSource.extras[ opt ], option, currentFile, opt, cb );
              }, extraCallBack);
            } else {
              extraCallBack( );
            }
          }, callBack);
        } else {
          callBack( );
        }
      });
    };
    // Loop over all the markdown files and lookup the data for the API request
    async.each( Object.keys( files ), ( fileName, callBack ) => {
      var fileParams = files[fileName];
      if ( !fileParams.dataSource ) return callBack( );
      const options = {
        host: fileParams.dataSource.host,
        port: fileParams.dataSource.port || '443',
        headers: {
          accept: '*/*'
        }
      };
      options.path = fileParams.dataSource.query;
      if ( opts.token && opts.token.name && opts.token.value ) {
        options.path += options.path.indexOf( '?' ) > -1 ? '&' : '?';
        options.path += opts.token.name + '=' + opts.token.value;
      }
      return callAPI( options, fileName, fileParams, callBack );
    }, done );
  };
};

export default apiCaller;
