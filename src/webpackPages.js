import path from 'path';
import webpack from 'webpack';
import fs from 'fs';
import _ from 'underscore';
import rm from 'rimraf';
import mkdirp from 'mkdirp';
import { forEachOf } from 'async';

let outputFiles = { };

const webpackPages = ( globalOptions ) => {
  const generateOutput = ( template, props, options, next ) => {
    let output = "var React = require( 'react' );";
    output += "var ReactDOM = require( 'react-dom' );";
    output += "var Element = require( '" + template + "' );";
    output += "if ( typeof Element.default === 'function' ) Element = Element.default;";
    output += 'var props = ' + JSON.stringify( props ) + ';';
    output += "var renderedElement = ReactDOM.render( <Element {...props} />, document.getElementById( 'content' ));";

    const destFilename = options.destFilename;
    const filename = path.join( options.tempDir, destFilename );

    outputFiles[ destFilename.replace( '.js', '' ) ] = filename;

    mkdirp( path.dirname( filename ), err => {
      if ( err ) return next( err );
      fs.writeFile( filename, output, ( error ) => {
        next( error || 'done' );
      });
    });
  };

  /* Return to metalsmith */
  return ( files, metalsmith, done ) => {
    if ( !( globalOptions.webpack && globalOptions.dest && globalOptions.directory )) return done();

    const iterator = ( prop, file, next ) => {
      const props = _.extend( { }, prop, metalsmith._metadata );
      props.tpl = ( globalOptions.noConflict ) ? 'rtemplate' : 'template';
      if ( !props[ props.tpl ] ) return;
      delete props.contents;
      delete props.stats;
      delete props.mode;
      const template = path.join( metalsmith._directory, globalOptions.directory, props[ props.tpl ] );
      globalOptions.destFilename = file.replace( path.extname( file ), '' ) + '.js';
      generateOutput( template, props, globalOptions, next );
    };

    const finishEach = ( error ) => {
      if ( error !== 'done' ) return done( error );
      globalOptions.webpack.entry = outputFiles;
      webpack( globalOptions.webpack, err => {
        rm( path.join( metalsmith._directory, '_tempOutput' ), ( ) => { } );
        done( err );
      } );
    };

    globalOptions.tempDir = path.join( metalsmith._directory, '_tempOutput' );
    globalOptions.dest = path.join( metalsmith._directory, globalOptions.dest );
    forEachOf( files, iterator, finishEach );
  };
};

export default webpackPages;
