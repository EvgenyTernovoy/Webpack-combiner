module.exports = {
    plugins: [
        require('autoprefixer'),
        require("css-mqpacker")({ //Pack same CSS media query rules into one using PostCSS
            sort: true
        }),
       // require("postcss-import"), //PostCSS plugin to transform @import rules by inlining content.
        require('postcss-inline-svg'), //PostCSS plugin to reference an SVG file and control its attributes with CSS syntax
        //require('postcss-object-fit-images'),
        /*require('postcss-image-inliner')({
            // Осторожнее с именами файлов картинок! Добавляйте имя блока как префикс к имени картинки.
            assetPaths : [
                'src/blocks/!**!/bg-img/',
            ],
            // Инлайнятся только картинки менее 5 Кб.
            maxFileSize: 5120
        })*/
    ]
};