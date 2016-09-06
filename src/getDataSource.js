import prismic from 'metalsmith-prismic';
import hxseo from './getHXSEOContent';

const getDataSource = ( opts ) => {
  if ( !opts.dataSource ) return false;

  if ( typeof opts.dataSource === 'function' ) return opts.dataSource;

  // Lets work out the datasource
  if ( opts.dataSource.type === 'prismic' ) {
    return prismic({
      'url': opts.dataSource.url,
      'linkResolver': function( ctx, doc ) {
        if ( doc.isBroken ) return '';
        return '/' + doc.uid;
      }
    }, opts.dataSource.accessToken );
  }
  if ( opts.dataSource.type === 'hxseo' ) {
    return hxseo({
      'url': opts.dataSource.url
    } );
  }

};

export default getDataSource;
