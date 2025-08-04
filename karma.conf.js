module.exports = function (config) {
    config.set({
      basePath: '',
      frameworks: ['jasmine', '@angular-devkit/build-angular'],
      plugins: [
        require('karma-jasmine'),
        require('karma-chrome-launcher'),
        require('karma-jasmine-html-reporter'),
        require('karma-coverage'),
        require('@angular-devkit/build-angular/plugins/karma')
      ],
      client: {
        jasmine: {
          random: false // Отключен случайный порядок тестов (по умолчанию Jasmine (и Karma с Jasmine) запускает тесты в случайном порядке. Это сделано специально, чтобы выявлять зависимости между тестами (т.е. тесты не должны зависеть друг от друга и порядок не должен влиять на результат))
        },
        clearContext: false // оставляет вывод Jasmine Spec Runner в браузере
      },
      coverageReporter: {
        dir: require('path').join(__dirname, './coverage'), // Папка для отчета
        subdir: '.',
        reporters: [
          { type: 'html' },  // HTML-отчёт (откроется в браузере)
          { type: 'text-summary' } // Краткая статистика в консоль
        ]
      },
      reporters: ['progress', 'kjhtml', 'coverage'],
      port: 9876,
      colors: true,
      logLevel: config.LOG_INFO,
      autoWatch: true,
      browsers: ['Chrome'],
      singleRun: false,
      restartOnFileChange: true
    });
  };
  