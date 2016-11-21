import prismic from './metalsmith-prismic';
import hxseo from './getHXSEOContent';

const getDataSource = ( opts ) => {
  if ( !opts.dataSource ) return false;

  if ( typeof opts.dataSource === 'function' ) return opts.dataSource;

  // Lets work out the datasource
  if ( opts.dataSource.type === 'prismic' ) {
    const configLinkResolver = opts.config.linkResolver instanceof Function && opts.config.linkResolver;
    return prismic({
      'url': opts.dataSource.url,
      'accessToken': opts.dataSource.accessToken,
      'linkResolver': configLinkResolver || function( ctx, doc ) {
        if ( doc.isBroken ) return '';
        return '/' + doc.uid;
      }
    });
  }
  if ( opts.dataSource.type === 'hxseo' ) {
    return hxseo({
      'url': opts.dataSource.url,
      'token': opts.dataSource.token
    } );
  }

};

export default getDataSource;
