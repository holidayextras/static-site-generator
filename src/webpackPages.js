import path from 'path';
import 'babel/polyfill';
import webpack from 'webpack';
import fs from 'fs';
import rm from 'rimraf';

let outputFiles = { };

const webpackPages = ( globalOptions ) => {
  globalOptions = Object.assign( { }, {
    directory: '_layout/_templates',
    noConflict: true,
    dest: '_site/js',
    webpack: null
  }, globalOptions );

  const generateOutput = ( template, props, options ) => {
    let output = "var React = require( 'react' );";
    output += "var ReactDOM = require( 'react-dom' );";
    output += "var Element = require( '" + template + "' ).default;";
    output += 'var props = ' + JSON.stringify( props ) + ';';
    output += "var renderedElement = ReactDOM.render( <Element {...props} />, document.getElementById( 'content' ));";

    const destFilename = options.destFilename;
    const filename = path.join( options.tempDir, destFilename );
    if ( !fs.existsSync( path.dirname( filename ) )) fs.mkdirSync( path.dirname( filename ));
    outputFiles[ destFilename ] = filename;
    fs.writeFile( filename, output );
  };

  /* Return to metalsmith */
  return ( files, metalsmith, done ) => {
    if ( !globalOptions.webpack ) return done( );
    globalOptions.tempDir = path.join( metalsmith._directory, '_tempOutput' );
    globalOptions.dest = path.join( metalsmith._directory, globalOptions.dest );
    Object.keys( files ).forEach( file => {
      let props = Object.assign( { }, files[ file ], metalsmith._metadata );
      props.tpl = ( globalOptions.noConflict ) ? 'rtemplate' : 'template';
      if ( !props[ props.tpl ] ) return;
      delete props.contents;
      delete props.stats;
      const template = path.join( metalsmith._directory, globalOptions.directory, props[ props.tpl ] );
      globalOptions.destFilename = file.replace( path.extname( file ), '' ) + '.js';
      generateOutput( template, props, globalOptions );
    });

    const webpackConfig = Object.assign( { }, globalOptions.webpack, {
      entry: outputFiles,
      output: {
        path: globalOptions.dest,
        filename: '[name]'
      }
    });
    webpack( webpackConfig, err => {
      if ( err ) throw err;
      rm( path.join( metalsmith._directory, '_tempOutput' ), ( ) => { } );
    } );
    return done( );
  };
};

export default webpackPages;
