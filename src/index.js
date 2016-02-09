import path from 'path';
import Metalsmith from 'metalsmith';
import markdown from 'metalsmith-markdown';
import template from 'metalsmith-react-tpl';
import prismic from '../_plugins/lib/prismic';
import assets from 'metalsmith-assets';
import getPrismicContent from '../_plugins/lib/getPrismicContent';
import webpackPages from '../_plugins/lib/webpackPages';

const MetalSmithLoader = ( opts ) => {

  if ( !opts.src ) throw 'No src param provided for the .md file directory';
  if ( !opts.prismic ) throw 'No prismic param provided for the prismic endpoint';
  if ( !opts.templateDir ) throw 'No templateDir param provided for the template directory';
  if ( !opts.layoutDir ) throw 'No layoutDir param provided for the layouts directory';
  if ( !opts.destination ) throw 'No destination param provided for the output directory';
  if ( !opts.assets ) throw 'No assets param provided for the assets directory';

  if ( !opts.config ) opts.config = { };

  new Metalsmith( opts.src )
    .clean( opts.clean )
    .metadata( opts.config )
    .use( prismic({
      'url': opts.prismic,
      'linkResolver': function( ctx, doc ) {
        if ( doc.isBroken ) return '';
        return '/' + doc.uid;
      }
    } ))
    .use( getPrismicContent( ))
    .use( markdown( ))
    .use( template({
      babel: true,
      noConflict: false,
      isStatic: true,
      baseFile: 'layout.jsx',
      baseFileDirectory: opts.layoutDir,
      directory: opts.templateDir
    } ))
    .destination( opts.destination )
    .use( assets( {
      source: './' + opts.assets,
      destination: './'
    } ))
    .use( webpackPages({
      directory: opts.templateDir,
      noConflict: false,
      dest: path.join( opts.destination, 'js' ),
      webpack: require( opts.webpack )
    } ))
    .build( function( err ) {
      if ( err ) throw err;
    } );
};

export default MetalSmithLoader;
