const getPrismicContent = ( ) => {

  return ( files, metalsmith, done ) => {
    Object.keys( files ).forEach( file => {
      const pageData = files[file].prismic.page.results[0];
      files[file].pageData = pageData.data;
      Object.keys( pageData.data ).forEach( data => {
        if ( typeof pageData.data[data].json.value === 'string' ) {
          files[file].pageData[ data ] = pageData.data[data].json.value;
        }
        delete files[file].prismic.page.results[0].data[data].json;
      } );
      files[file].pagename = file;
    } );
    return done( );
  };
};

export default getPrismicContent;
