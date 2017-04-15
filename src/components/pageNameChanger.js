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

export default pageNameChanger;
