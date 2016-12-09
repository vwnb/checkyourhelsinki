var path = require('path');
var webpack = require('webpack');

module.exports = {
  devtool: 'eval',
  entry: [
    './src/index'
  ],
  output: {
    path: path.join(__dirname, 'src'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['babel-loader'],
      include: path.join(__dirname, 'src')
    },
                             {test: /\.css$/, loader: 'style!css?modules!postcss'},
                    ]
  }
};
