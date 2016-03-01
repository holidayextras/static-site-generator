const getPrismicContent = ( ) => {

  return ( files, metalsmith, done ) => {
    Object.keys( files ).forEach( file => {
      const pageData = files[file].prismic.page.results[0];
      files[file].pageData = pageData.data;
      Object.keys( pageData.data ).forEach( data => {
        if ( typeof pageData.data[data].json.value === 'string' ) {
          files[file].pageData[ data ] = pageData.data[data].json.value;
        }
        // Get the data from fetchLinks fragments to save the html
        if ( pageData.data[data].json && pageData.data[data].json.fragments ) {
          Object.keys( pageData.data[data].json.fragments ).forEach( child => {
            if ( typeof pageData.data[data].json.fragments[child].value === 'string' ) {
              const newName = child.replace( pageData.data[data].json.type + '.', '' );
              files[file].pageData[ data ][newName] = pageData.data[data].json.fragments[child].value;
            }
          } );
        }
        delete files[file].prismic.page.results[0].data[data].json;
      } );
      files[file].pagename = file;
    } );
    return done( );
  };
};

export default getPrismicContent;
