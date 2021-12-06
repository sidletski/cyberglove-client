const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '/src/public/index.html'),
      inject: 'body'
    }),
    new MiniCssExtractPlugin()
  ],
  resolve: {
    alias: {
      '~/': path.resolve(__dirname, 'src/')
    }
  },
  devServer: {
    contentBase: './src/public',
    port: 8080,
    host: '0.0.0.0'
  },
  performance: {
    maxEntrypointSize: 1024000,
    maxAssetSize: 1024000
  }
}
