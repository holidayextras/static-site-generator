import _ from 'underscore';
import PageData from './components/pageData';

const getHXSEOContent = ( opts ) => {
  return ( files, metalsmith, done ) => {
    // We store this in the wrong place sometimes
    opts.token = {
      name: 'token',
      value: opts.url.token
    };
    new PageData({
      opts,
      files,
      initSetup: params => {
        if ( !params.hxseo ) return { };
        params.dataSource = _.extend( { }, opts.url, params.hxseo );
        if ( !opts.token ) throw ( 'Must provide a token for SEO api access' );
        // Extend params needed
        params.dataSource.repeater = 'data';
        params.dataSource.pageDataField = 'attributes';
        params.dataSource.pageNameField = 'pageName';
        return params;
      }
    }).then( ( data ) => {
      files = data;
      done( );
    });
  };
};

export default getHXSEOContent;
