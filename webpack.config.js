const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        app: './src/app.ts',
        'logins-window': './src/logins-window.ts',
    },
    output: {
        path: path.resolve(__dirname, 'resources/js/build'),
        filename: '[name].bundle.js',
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
};
