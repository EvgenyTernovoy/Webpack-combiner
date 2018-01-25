const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const merge = require('webpack-merge');
const uglifyJS = require('./webpack/js.uglify');
const devtool = require('./webpack/devtool');
const StatsWriterPlugin = require("webpack-stats-plugin").StatsWriterPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const extractHtml = new ExtractTextPlugin('[name]');
const extractSass = new ExtractTextPlugin('[name]');

const paths = {
    build: path.join(__dirname, '../public'),
    sass : path.join(__dirname, 'sass')
};

// Получение настроек проекта из projectConfig.json
let projectConfig = require('./projectConfig.json');
let dirs = projectConfig.dirs;
let lists = getFilesList(projectConfig);

// Сообщение, записываемое в стилевой файл
let styleFileMsg = '/*!*\n * ВНИМАНИЕ! Этот файл генерируется автоматически.\n * Не пишите сюда ничего вручную, все такие правки будут потеряны при следующей компиляции.\n * Правки без возможности компиляции ДОЛЬШЕ И ДОРОЖЕ в 2-3 раза.\n * Нужны дополнительные стили? Создайте новый css-файл и подключите его к странице.\n * Читайте ./README.md для понимания.\n */\n\n';

// Формирование и запись диспетчера подключений (style.scss), который компилируется в style.min.css
let styleImports = styleFileMsg;
lists.css.forEach(function (blockPath) {
    styleImports += '@import \'' + blockPath + '\';\n';
});
styleImports = styleImports += styleFileMsg;
fs.writeFileSync(dirs.srcPath + 'scss/style.scss', styleImports);
const now = Date.now() / 1000;
const then = now - 10;
fs.utimesSync( dirs.srcPath + 'scss/style.scss', then, then );

// Формирование и запись списка примесей (mixins.pug) со списком инклудов всех pug-файлов блоков
let pugMixins = '//- ВНИМАНИЕ! Этот файл генерируется автоматически. Не пишите сюда ничего вручную!\n//- Читайте ./README.md для понимания.\n\n';
lists.pug.forEach(function(blockPath) {
    pugMixins += 'include '+blockPath+'\n';
});
fs.writeFileSync(dirs.srcPath + 'pug/mixins.pug', pugMixins);

// Pug-фильтр, выводящий содержимое pug-файла в виде форматированного текста
const filterShowCode = function (text, options) {
    var lines = text.split('\n');
    var result = '<pre class="code">\n';
    if (typeof(options['first-line']) !== 'undefined') result = result + '<code>' + options['first-line'] + '</code>\n';
    for (var i = 0; i < (lines.length - 1); i++) { // (lines.length - 1) для срезания последней строки (пустая)
        result = result + '<code>' + lines[i] + '</code>\n';
    }
    result = result + '</pre>\n';
    result = result.replace(/<code><\/code>/g, '<code>&nbsp;</code>');
    return result;
}

module.exports = env => {

    // Получаем окуржение
    let testEnv = (function (env) {
        if (env === 'prod') {
            console.log('-------- Production');
            return true;
        } else {
            console.log('-------- Development');
            return false;
        }
    })(env);

    // Основные настройки
    let common = merge(
        [{
            entry  : {
                // bundle.js, style.css попадают в placeholder name
                // пути указанные в свойстве актуальны для компиляции,
                // т.е. собранный [name].{js,css} будет доступен по
                // paths.build + path/to/entry + [name].{js,css,etc.}

                'js/script.js': lists.js,
                'css/style.css': dirs.srcPath + 'scss/style.scss',
                'index.html': dirs.srcPath + 'index.pug',
                'demo.html': dirs.srcPath + 'blocks-demo.pug',

            },
            output : {
                path    : path.join(__dirname, dirs.buildPath),
                filename: "[name]"
            },
            // опции лоадеров на генерацию source-map не влияют
            plugins: [
                new webpack.ProvidePlugin({
                    $     : 'jquery',
                    jQuery: 'jquery'
                }),
                /*new HtmlWebpackPlugin({
                    template: dirs.srcPath + 'test.pug'
                }),*/
                extractHtml,
                extractSass,
                new StatsWriterPlugin({
                    filename: "stats.json",
                    fields: null
                })
            ],
            module : {
                rules: [
                    {
                        test   : /\.js$/,
                        exclude: /(node_modules|bower_components)/,
                        use    : {
                            loader : 'babel-loader',
                            options: {
                                presets: ['@babel/preset-env'],
                                //plugins: ['@babel/transform-runtime']
                            }
                        }
                    },
                    {
                        test   : /\.pug$/,
                        use   : extractHtml.extract({
                            use: [
                                'html-loader',
                                {
                                    loader : 'pug-html-loader',
                                    options: {
                                        pretty: true,
                                        exports: false,
                                        filters: {
                                            'show-code': filterShowCode
                                        }
                                    }
                                }
                            ]
                        })
                    },
                    {
                        test   : /\.(jpg|png|svg)$/,
                        loader : 'file-loader',
                        options: {
                            name: 'images/[name].[ext]'
                        },
                    },
                    // loader для компиляции scss в отдельный сss
                    {
                        test   : /\.scss$/,
                        exclude: /node_modules/,
                        use    : extractSass.extract({
                            fallback: 'style-loader',
                            use: [
                                {
                                    loader : 'css-loader',
                                    options: {
                                        //url: false потому что иначе не заработало...
                                        url     : false,
                                        minimize: testEnv,
                                    }
                                },
                                'postcss-loader',
                                {
                                    loader: 'sass-loader',
                                }
                            ],
                        })
                    },
                    {
                        test   : /\.css$/,
                        include: [
                            // paths.css возможно понадобиться указать папку где лежат css
                        ],
                        use    : ExtractTextPlugin.extract({
                            //fallback: 'style-loader',
                            use: ['style-loader', 'css-loader']
                        }),
                        exclude: /node_modules/
                    }
                ]
            },
            watch:true
        }
        ]);

    // возвращаем настройки
    if (!testEnv) {
        return merge([
            common,
            devtool()
        ]);
    } else {
        return merge([
            common,
            uglifyJS()
        ]);
    }
};


/**
 * Вернет объект с обрабатываемыми файлами и папками
 * @param  {object}
 * @return {object}
 */
function getFilesList(config) {

    let res = {
        'css': [],
        'js' : [],
        'img': [],
        'pug': [],
    };

    // Style
    for (let blockName in config.blocks) {
        res.css.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + '.scss');
        if (config.blocks[blockName].length) {
            config.blocks[blockName].forEach(function (elementName) {
                res.css.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + elementName + '.scss');
            });
        }
    }
    res.css = res.css.concat(config.addCssAfter);
    res.css = config.addCssBefore.concat(res.css);

    // JS
    for (let blockName in config.blocks) {
        let jsPath =  config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + '.js';
        if(fileExist(jsPath)) {
            res.js.push(jsPath);
        }

        if (config.blocks[blockName].length) {
            config.blocks[blockName].forEach(function (elementName) {
                let jsSubPath = config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/' + blockName + elementName + '.js';
                if(fileExist(jsPath)) {
                    res.js.push(jsSubPath);
                }
            });
        }
    }
    res.js = res.js.concat(config.addJsAfter);
    res.js = config.addJsBefore.concat(res.js);

    // Images
    for (let blockName in config.blocks) {
        res.img.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/img/*.{jpg,jpeg,gif,png,svg}');
    }
    res.img = config.addImages.concat(res.img);

    // Pug
    for (let blockName in config.blocks) {
        res.pug.push('../blocks/' + blockName + '/' + blockName + '.pug');
    }

    return res;
}

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки]
 * @return {boolean}
 */
function fileExist(path) {
    const fs = require('fs');
    try {
        fs.statSync(path);
    } catch(err) {
        return !(err && err.code === 'ENOENT');
    }
}