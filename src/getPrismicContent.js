const getPrismicContent = ( ) => {

  return ( files, metalsmith, done ) => {

    // Adjusts the pageData from prismic to return the value of the fragment instead of the whole entity
    const getFragmentValues = ( fragment, file, data ) => {
      Object.keys( fragment.json.fragments ).forEach( child => {
        if ( typeof fragment[child].value === 'string' ) {
          const newName = child.replace( fragment.json.type + '.', '' );
          files[file].pageData[data][newName] = fragment[child].value;
        }
      });
    };

    // Sort out the pageData from prismic, into an easier props way
    const getPrismicData = ( pageData, file ) => {
      Object.keys( pageData ).forEach( data => {
        if ( typeof pageData[data].json.value === 'string' ) {
          files[file].pageData[ data ] = pageData[data].json.value;
        }
        // Get the data from fetchLinks fragments to save the html
        if ( pageData[data].json && pageData[data].json.fragments ) getFragmentValues( pageData[data], file, data );

        // Delete old data now
        delete files[file].prismic.page.results[0].data[data].json;
      } );
    };

    Object.keys( files ).forEach( file => {
      files[file].pageData = getPrismicData( files[file].prismic.page.results[0].data, file );
      files[file].pagename = file;
    });
    return done( );
  };
};

export default getPrismicContent;
