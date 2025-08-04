import { TestScheduler } from 'rxjs/testing';
import {
  animationFrameScheduler,
  asapScheduler,
  asyncScheduler,
  bufferCount,
  bufferTime,
  catchError,
  concatMap,
  debounceTime,
  delay,
  EMPTY,
  EmptyError,
  first,
  forkJoin,
  interval,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  tap,
  throttleTime,
  throwError,
  filter,
  exhaustMap,
  mergeAll,
  observeOn,
  scheduled,
} from 'rxjs';
import { cold } from 'jasmine-marbles';

// === Ф-ции Jasmine ===

describe('Сравнение двух одинаковых тестов с использованием библиотеки jasmine-marbles и без (через ручное создание и управление TestScheduler)', () => {
 
  // Вот как выглядел бы тест, если бы мы его описывали так, как описано в официальной доке rxjs
  describe('Пример вручную с TestScheduler', () => {

    it('должен домножать значения на 2', () => {

      // === TestScheduler ===

      const testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });
    
      // === Testing ===
      testScheduler.run(({ cold, expectObservable }) => {
        const source = cold('-a-b-c-|', { a: 1, b: 2, c: 3 });
        const expected =    '-x-y-z-|';
        const expectedValues = { x: 2, y: 4, z: 6 };
    
        expectObservable(source.pipe(map(x => x * 2))).toBe(expected, expectedValues); // Декларация ожиданий
      });
    });

  });

  // === jasmine-marbles ===

  // jasmine-marbles делает все это автоматически под капотом
  describe('Пример с jasmine-marbles', () => {

    it('должен домножать значения на 2', () => {
      const source = cold('  -a-b-c-|', { a: 1, b: 2, c: 3 });
      const expected = cold('-x-y-z-|', { x: 2, y: 4, z: 6 });
      expect(source.pipe(map(x => x * 2))).toBeObservable(expected);
    });

  });

});

// === Операторы RxJs ===

describe('Тестирование операторов RxJS, подписок, холодных и горячих Observable', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  // Ну и сразу пример с виду очень похожих операторов, но незначительно отличающихся

  it('take', () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, expectSubscriptions } = helpers;
      const obs1 = cold('     -a--b--c---|');
      const obs1subs = '      ^!';
      const expected1 = cold('-(a|)');

      // Отличие от first() в том, что если obs2 не испустит ни одного значения и завершится, то
      // expected2 так же завершится без ошибки
      const obs2 = cold('     ---|');
      const expected2 = cold('---|');

      expectObservable(obs1.pipe(take(1))).toEqual(expected1);
      expectObservable(obs2.pipe(take(1))).toEqual(expected2);
      expectSubscriptions(obs1.subscriptions).toBe(obs1subs);
    });
  });

  it('first', () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, expectSubscriptions } = helpers;
      const obs1 = cold('     -a--b--c---|');
      const obs1subs = '      ^!';
      const expected1 = cold('-(a|)');

      // Отличие от take(1) в том, что если obs2 не испустит ни одного значения и завершится, то
      // expected2 завершится ошибкой класса EmptyError
      const obs2 = cold('     ---|');
      const expected2 = cold('---#', undefined, new EmptyError());

      console.log('>>> EmptyError: ', new EmptyError());
      console.log('>>> Error: ', new Error());

      expectObservable(obs1.pipe(first())).toEqual(expected1);
      expectObservable(
        obs2.pipe(
          first(),
          catchError((e) => {
            console.log(e); // EmptyError
            return throwError(e);
          })
        )
      ).toEqual(expected2);
      expectSubscriptions(obs1.subscriptions).toBe(obs1subs);
    });
  });

  it('first: должен выбрасывать ошибку, если Observable завершился, не выдав ни одного значения.', () => {
    testScheduler.run(({ expectObservable }) => {
      const source$ = EMPTY;

      const expectedMarble = '#'; // Error

      expectObservable(source$.pipe(first())).toBe(
        expectedMarble,
        null,
        new EmptyError()
      );
    });
  });

  // Задерживает выдачу элементов из исходного Observable на заданный промежуток времени или до указанной даты.
  it('delay', () => {
    testScheduler.run(({ time, cold, expectObservable }) => {
      const source = cold('---a--b--|');
      const t = time('        --|    ');
      //                         --|
      const expected = '   -----a--b|';
      const result = source.pipe(delay(t));
      expectObservable(result).toBe(expected);
    });
  });

  // Выдаёт значение из исходного Observable, затем игнорирует последующие значения из источника в течение duration миллисекунд, после чего повторяет этот процесс.
  it('throttleTime', () => {
    testScheduler.run((helpers) => {
      const { cold, time, expectObservable, expectSubscriptions } = helpers;
      const obs1 = cold('-a-b--c---|');
      const obs1subs = ' ^---------!';
      const t = time('    ---|        '); // t = 3
      const expected = ' -a----c---|';

      expectObservable(obs1.pipe(throttleTime(t))).toBe(expected);
      expectSubscriptions(obs1.subscriptions).toBe(obs1subs);
    });
  });

  // Выдаёт уведомление из исходного Observable только после того, как прошёл определённый промежуток времени без появления нового значения из источника.
  it('debounceTime', () => {
    testScheduler.run((helpers) => {
      const { cold, time, expectObservable, expectSubscriptions } = helpers;
      const obs1 = cold('-a--b--c---|');
      const obs1subs = ' ^----------!';
      const t = time('    ---|       '); // t = 3
      //                     ---|
      //                        ---|
      const expected = ' ----------c|';

      expectObservable(obs1.pipe(debounceTime(t))).toBe(expected);
      expectSubscriptions(obs1.subscriptions).toBe(obs1subs);
    });
  });

  // Применяет заданную функцию к каждому значению, испускаемому исходным Observable, и выдаёт полученные значения как Observable.
  it('map', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = { a: 1, b: 2, c: 3, x: 1, y: 4, z: 9 };
      const obs1 = cold('-a-b-c---|      ', values);
      const expected = ' -x-y-z---|';
      const result = obs1.pipe(map((i) => i * i));
      expectObservable(result).toBe(expected, values);
    });
  });

  // Преобразует каждое значение в Observable (map), затем объединяет все эти внутренние Observables с помощью mergeAll.
  it('mergeMap', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = { a: 'hello', b: 'world', x: 'hello world' };
      const obs1 = cold('-a----a|      ', values);
      const obs2 = cold(' -b-b-b-|     ', values);
      const expected = ' --x-x-xx-x-x-|';
      //                       -b-b-b-|
      const result = obs1.pipe(
        mergeMap((x) => obs2.pipe(map((y) => x + ' ' + y)))
      );
      expectObservable(result).toBe(expected, values);
    });
  });

  // Ожидает завершения всех Observables и затем объединяет последние выданные ими значения; 
  // завершает выполнение сразу, если передан пустой массив.
  // forkJoin в RxJS — это аналог Promise.all в JavaScript
  // forkJoin используется для того, чтобы запустить несколько Observable одновременно и дождаться, 
  // пока все они завершатся, после чего выдать результат — массив (или объект) 
  // последних значений каждого из Observable. Если хотя бы один Observable завершился с ошибкой, 
  // итоговый Observable тоже завершится с ошибкой. 
  // Обычно forkJoin применяют, когда нужно параллельно выполнить несколько независимых асинхронных операций 
  // и обработать их результаты только после завершения всех.
  // Выполнение нескольких HTTP-запросов и работа с результатами только после того, 
  // как все запросы успешно завершатся (например, загрузка профиля пользователя, 
  // списка его задач и уведомлений одновременно).
  it('forkJoin', () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;
      const values = { a: 1, b: 2, c: 3, r: [1, 2, 3] };
      const obs1 = cold('      ------(a|)', values);
      const obs2 = cold('      -(b|)', values);
      const obs3 = cold('      ----(c|)', values);
      const obsErr = cold('    --#');

      const expected = '       ------(r|)';
      const expectedWithErr = '--#';

      expectObservable(forkJoin([obs1, obs2, obs3])).toBe(expected, values);
      expectObservable(
        forkJoin([obs1, obs2, obs3, obsErr]).pipe(
          catchError((e) => {
            console.log(e); // простая строка 'error'
            return throwError(e);
          })
        )
      ).toBe(expectedWithErr);
    });
  });

  /* 

  Синхронные группировки

  Из официальной документации rxjs:

  '()' sync groupings: When multiple events need to be in the same frame synchronously, parentheses are used to group those events. You can group next'd values, a completion, or an error in this manner. The position of the initial ( determines the time at which its values are emitted. While it can be counter-intuitive at first, after all the values have synchronously emitted time will progress a number of frames equal to the number of ASCII characters in the group, including the parentheses. e.g. '(abc)' will emit the values of a, b, and c synchronously in the same frame and then advance virtual time by 5 frames, '(abc)'.length === 5. This is done because it often helps you vertically align your marble diagrams, but it's a known pain point in real-world testing. Learn more about known issues.

  '()' синхронные группировки: когда несколько событий должны произойти в одном кадре синхронно, 
  используются круглые скобки для группировки этих событий. Таким образом можно сгруппировать значения, 
  переданные через next, завершение (complete) или ошибку (error). 
  Положение открывающей скобки ( определяет момент времени, когда будет произведена эмиссия этих значений. 
  Хотя это может показаться неочевидным сначала, после того как все значения внутри скобок синхронно 
  сгенерированы, время продвинется на такое количество кадров, которое равно количеству ASCII-символов 
  в группе, включая сами скобки. Например, '(abc)' — это эмиссия значений a, b и c синхронно в одном кадре, 
  после чего виртуальное время продвинется на 5 кадров, так как длина строки '(abc)' равна 5. 
  Это сделано для того, чтобы была возможность вертикально выравнивать marble-диаграммы, 
  однако на практике это может доставлять неудобства при тестировании.

  */



  // разные планировщики
  
  // queueScheduler - планирование синхронного кода
  // asapScheduler - планирование кода в очередь микрозадач
  // asyncScheduler - планирование кода в очередь макрозадач
  // animationFrameScheduler - планирование кода в очередь перед перерисовкой контента
  it('merge, delay, animate() & animationFrameScheduler', () => {
    testScheduler.run(({ animate, expectObservable, time }) => {
      animate('         --------x');
      const tb = time(' ------|  ');
      const expected = '(dc)--b-(a|)';

      const result = merge(
        of('a').pipe(delay(0, animationFrameScheduler)),
        of('b').pipe(delay(tb, asyncScheduler)),
        of('c').pipe(delay(0, asyncScheduler)), // можно не указывать, delay по умолчанию использует этот планировщик
        of('d').pipe(delay(0, asapScheduler))
      );
      expectObservable(result).toBe(expected);
    });
  });

  /*

  animationFrameScheduler

  animationFrameScheduler синхронизирует выполнение задач с кадровой разверткой браузера. 
  В его основе лежит метод window.requestAnimationFrame. 
  Это API сообщает браузеру, что вы хотите выполнить анимированное действие, 
  и просит его вызвать определённую функцию перед следующей перерисовкой экрана.

  Применения:
    - Плавная анимация элементов DOM.
    - Графические визуализации.
    - Игровая логика, синхронизированная по кадрам.

  interval(0).pipe(
    observeOn(animationFrameScheduler)
  ).subscribe(x => {
    // Этот код будет вызываться при каждом кадре перерисовки браузера
    console.log(x);
  });

  Здесь interval(0) начинает эмитить значения как можно чаще, 
  но через observeOn(animationFrameScheduler) каждое уведомление будет 
  синхронизироваться с фазой рендеринга браузера.

  Позволяет реализовать анимации на базе RxJS.

  Гарантирует, что обновления будут происходить только в "идеальные" моменты, когда браузер готов к 
  отрисовке, что предотвращает лишние перерисовки и нагрузку на CPU.

  Почти все задачи обновления интерфейса, требующие высокой частоты кадров, 
  должны выполняться через этот scheduler.

  */

  // пример из документации rxjs
  it('delay, animate() & animationFrameScheduler', () => {
    testScheduler.run(({ animate, cold, expectObservable }) => {
      animate('              ---x---x---x---x');
      const requests = cold('-a-------b------');
      const expected = '     ---a-------b----';

      expectObservable(requests.pipe(delay(0, animationFrameScheduler))).toBe(
        expected
      );
    });
  });


  it('bufferCount', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        r: [1, 2],
        x: [3, 1],
        y: [2, 3],
        z: [4],
      };
      const obs1 = cold('(abc)---(abcd|)', values);
      const expected = ' r-------(xyz|)';
      const result = obs1.pipe(bufferCount(2));
      expectObservable(result).toBe(expected, values);
    });
  });

  it('bufferTime', () => {
    testScheduler.run(({ cold, expectObservable, time }) => {
      const values = { a: 1, b: 2, c: 3, r: [1, 2, 3] };
      const t = time('-|');
      const obs1 = cold('(abc|)', values);
      const expected = ' (r|)';
      const result = obs1.pipe(bufferTime(t));
      expectObservable(result).toBe(expected, values);
    });
  });

  it('bufferTime 2', () => {
    testScheduler.run(({ cold, expectObservable, time }) => {
      const values = { a: 1, b: 2, c: 3, r: [1, 2, 3], e: [] };
      const t = time('-|');
      const obs1 = cold('(abc)---(abc|)', values);
      const expected = ' -reeeeee(r|)';
      const result = obs1.pipe(bufferTime(t));
      expectObservable(result).toBe(expected, values);
    });
  });

  // Еще немного про синтаксис marble-диаграмм:
  // Информация из официальной документации:

  // NOTE: You may have to subtract 1 millisecond from the time you want to progress because the alphanumeric marbles (representing an actual emitted value) advance time 1 virtual frame themselves already, after they emit. This can be counter-intuitive and frustrating, but for now it is indeed correct.

  // Примечание: Возможно, вам придется вычесть 1 миллисекунду из времени, на которое вы хотите продвинуться, 
  // потому что алфавитно-цифровые шарики (представляющие собой фактически сгенерированное значение) 
  // сами уже сдвигают время на 1 виртуальный кадр после своего появления. 
  // Это может показаться нелогичным и вызывать раздражение, но на данный момент это действительно так.

  it('concatMap, of, delay - синтаксис продвижения времени', () => {
    testScheduler.run(({ cold, expectObservable, time }) => {
      const input = ' -a-b-c|';
      const expected = '-- 9ms a 9ms b 9ms (c|)';

      // Depending on your personal preferences you could also
      // use frame dashes to keep vertical alignment with the input.
      // const input = ' -a-b-c|';
      // const expected = '------- 4ms a 9ms b 9ms (c|)';
      // or
      // const expected = '-----------a 9ms b 9ms (c|)';

      const result = cold(input).pipe(concatMap((d) => of(d).pipe(delay(10))));

      expectObservable(result).toBe(expected);
    });
  });

  // Необходимо вручную отписаться от источника, который никогда не завершится:
  it('interval - должен повторяться бесконечно', () => {
    testScheduler.run(({ expectObservable }) => {
      const foreverStream$ = interval(1).pipe(
        map(() => 'a')
      );

      // Пропуск этого аргумента может привести к сбою (аварийному завершению) набора тестов.
      const unsub = '------!';

      expectObservable(foreverStream$, unsub).toBe('-aaaaa');
    });
  });

  // Для горячего источника тестируем несколько подписчиков, которые подписываются в разное время:
  it('тестирование подписки на горячий источник', () => {
    testScheduler.run(({ hot, expectObservable }) => {
      const source = hot('--a--a--a--a--a--a--a--');
      const sub1 = '      --^-----------!';
      const sub2 = '      ---------^--------!';
      const expect1 = '   --a--a--a--a--';
      const expect2 = '   -----------a--a--a-';

      expectObservable(source, sub1).toBe(expect1);
      expectObservable(source, sub2).toBe(expect2);
    });
  });


  it('Синхронное утверждение (Synchronous Assertion) expect', () => {

    /*
    Из доки:

    Sometimes, we need to assert changes in state after an observable stream has completed - such as when a side effect like tap updates a variable. Outside of Marbles testing with TestScheduler, we might think of this as creating a delay or waiting before making our assertion.
    In the above situation we need the observable stream to complete so that we can test the variable was set to the correct value. The TestScheduler runs in 'virtual time' (synchronously), but doesn't normally run (and complete) until the testScheduler callback returns. The flush() method manually triggers the virtual time so that we can test the local variable after the observable completes.
    
    Иногда нам нужно проверить изменения состояния после завершения потока observable — 
    например, когда побочный эффект, такой как tap, обновляет переменную. 
    Вне тестирования с помощью Marbles и TestScheduler мы бы сделали задержку или подождали, 
    прежде чем проводить проверку.

    В описанной выше ситуации нам необходимо, чтобы наблюдаемый поток был завершён, 
    чтобы мы могли проверить, что переменной присвоено правильное значение. 
    TestScheduler работает в «виртуальном времени» (синхронно), 
    но обычно не запускается (и не завершается) до тех пор, пока не вернётся обратный вызов testScheduler. 
    Метод flush() вручную запускает виртуальное время, 
    чтобы мы могли проверить локальную переменную после завершения наблюдаемого потока.
    
    */

    testScheduler.run(({ cold, expectObservable, flush }) => {
      let eventCount = 0;

      const s1 = cold('--a--b|', { a: 'x', b: 'y' });

      // side effect using 'tap' updates a variable
      const result = s1.pipe(tap(() => eventCount++));

      // Асинхронное утверждение
      expectObservable(result).toBe('--a--b|', { a: 'x', b: 'y' });
      // Всё, что ожидается через expectObservable, проверяется только после полного окончания всех событий (flush).
      // Даже если мы не напишем flush(), сравнение выполнится только когда TestScheduler
      // перемотает время сам "под капотом"

      // Сиинхронное утверждение
      expect(eventCount).toBe(0);

      // flush - запускает «виртуальное время», 
      // чтобы завершить все невыполненные горячие или холодные наблюдаемые (observable).
      flush();

      expect(eventCount).toBe(2);
    });
  });

  it('Синхронное утверждение (Synchronous Assertion) expect - 2', () => {
    testScheduler.run((helpers) => {
      const { expectObservable, flush } = helpers;

      const source$ = of('correct value').pipe(delay(1000));

      let testVariable = '';

      source$.subscribe((value) => {
        testVariable = value;
      }); 

      // Ожидаем, что observable завершится после 1000ms
      expectObservable(source$).toBe('1s (a|)', { a: 'correct value' });
      // Сам по себе метод expectObservable не перематывает время. 
      // Он используется для описания ожидаемого поведения Observable. 
      // То есть, expectObservable не вызывает события и не выполняет задачи самостоятельно. 
      // Он просто фиксирует, как мы ожидаем, что Observable будет работать, 
      // и сравнивает это с фактическим поведением после того, как тест выполнится.

      // Ручной запуск всех событий
      flush();
      // Этот метод перематывает виртуальное время вперёд, выполняя все запланированные задачи и события, 
      // что позволяет Observable завершиться. Это ключевой момент, 
      // потому что без flush тест бы не завершил выполнение Observable, 
      // и значение переменной не было бы установлено.

      // Проверяем значение переменной после завершения observable
      expect(testVariable).toBe('correct value');
    });
  });

  // Немного вернемся к планировщикам
  // Но сначала рассмотрим типовую задачу про стек, микротаски и макротаски

  it('Задача: Асинхронное выполнение: setTimeout и Promise', async () => {
    let array: number[] = [];
  
    array.push(1);
    setTimeout(() => {
      array.push(2);
    });
    Promise.resolve().then(() => {
      array.push(3);
    });
    array.push(4);
  
    // Дадим событию стека, microtask и macrotask выполниться
    await new Promise(res => setTimeout(res));

    expect(array).toEqual([1, 4, 3, 2]);
  });

  // Эта же задача на планировщиках
  it('Задача: Асинхронное выполнение на планировщиках', () => {

    testScheduler.run(({ flush }) => {

      let array: number[] = [];
  
      merge(
        of(1),
        of(2, asyncScheduler), // deprecated, теперь надо писать как написано ниже:
        scheduled([3], asapScheduler),
        // of(3).pipe(observeOn(asapScheduler)), //  или использовать оператор
        of(4),
      ).subscribe(v => array.push(v));

      // observeOn - оператор, принимающий планировщик в качестве первого параметра, 
      // который будет использоваться для перепланирования уведомлений, 
      // отправляемых исходным Observable. Это может быть полезно, если у вас нет контроля 
      //над внутренним планировщиком данного Observable, но вы хотите контролировать отправку его значений.

      // Есть еще оператор subscribeOn.
      // Различие их в том, что observeOn планирует в каком контексте будут выполняться методы observer -
      // next, error и complete выполняются в соответствующем с Scheduler контексте. 
      // А subscribeOn влияет на subscriber — метод subscribe будет выполняться в другом контексте.
      // С помощью subscribeOn вы можете решить, какой тип планировщика будет использовать конкретный Observable 
      // при подписке на него, например если нам надо чтоб все подписки на источник попадали в очередь макрозадач,
      // тогда нужно использовать subscribeOn(asyncScheduler), например:
      // const a = of(1, 2, 3).pipe(subscribeOn(asyncScheduler));

      flush();

      expect(array).toEqual([1, 4, 3, 2]);
    });
  });
  

  it('обрабатывает поток команд с фильтрацией, трансформацией, switchMap, delay, catchError', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = {
        a: 'request 1',
        b: 'request 2',
        c: 'skip 1',
        e: 'error 1',
        A: 'Response: REQUEST 1',
        B: 'Response: REQUEST 2',
        E: 'Error: ERROR 1',
      };

      // Этот поток описывет как пользователь обращается к API во времени
      // здесь есть запросы, которые должны завершиться успешно (через какое-то время ответа сервера) (a: 'request 1', b: 'request 2'),
      // тот запрос который не должен вообще отправится на сервер, потому что не прошел фильтрацию (c: 'skip 1')
      // и запрос, который должен завершиться ошибкой (так же через какое-то время, допустим 500 ошибка сервера :) )
      const requests$ = cold('--a-b-c--e---b--|', values);
      const expected = '      -------B--E-----(B|)';
      //                        ---(A|)
      //                          ---(B|)
      //                               -#
      //                                   ---(B|)

      // Симуляция API
      function apiSimulator(request: string) {
        if (request.startsWith('ERROR')) {
          return cold('-#', undefined, new Error('fail!'));
        }
        // return of(`Response: ${request}`).pipe(delay(3));
        return cold('---(x|)', { x: `Response: ${request}` }); // заменяем of+delay на cold (для управления временем через marbles)
      }

      const result$ = requests$.pipe(
        filter((req) => !req.startsWith('skip')), // игнорируем ненужные команды
        map((req) => req.toUpperCase()), // небольшая обработка
        switchMap((req) =>
          apiSimulator(req).pipe(
            catchError(() => of(`Error: ${req}`)) // ловим ошибку внутри switchMap
          )
        )
      );

      expectObservable(result$).toBe(expected, values);
    });
  });

  // ------------------------------------------------------ //
});

// === Операторы высшего порядка ===

describe('X-Map операторы RxJs', () => {

  // mergeMap преобразует каждое входящее значение в Observable, запускает их параллельно и объединяет все их значения в один поток. 
  // Если приходит следующее значение, предыдущие внутренние Observable, которые еще не завершились, продолжают работать.
  describe('mergeMap', () => {
    it('должен маппить значения во внутренние observable и объединять их, позволяя им работать параллельно', () => {
      const values = { a: 'hello', b: 'world', x: 'hello world' };
      const obs1 = cold('    -a--a----a--|', values);
      const obs2 = cold('     -b-b-b-|', values);
      //                         -b-b-b-|
      //                              -b-b-b-|
      const expected = cold('--x-xxxx-xx-x-x-|', values);

      const result = obs1.pipe(
        mergeMap((x) => obs2.pipe(map((y) => x + ' ' + y)))
      );      

      expect(result).toBeObservable(expected);
    });

    it('mergeMap - это map + mergeAll', () => {
      const values = { a: 'hello', b: 'world', x: 'hello world' };
      const obs1 = cold('    -a--a----a--|', values);
      const obs2 = cold('     -b-b-b-|', values);
      //                         -b-b-b-|
      //                              -b-b-b-|
      const expected = cold('--x-xxxx-xx-x-x-|', values);
  
  
      // mergeMap - это map + mergeAll
      const result = obs1.pipe(
        map((x) => obs2.pipe(map((y) => x + ' ' + y))),
        mergeAll()
      );      
  
      expect(result).toBeObservable(expected);
    });
  });

  // switchMap преобразует каждое значение в новый observable, 
  // но предыдущий внутренний observable отменяется при поступлении нового значения. 
  // В результате только последний внутренний поток выдаёт значения.
  describe('switchMap', () => {
    it('если предыдущий внутренний поток не завершился, но во внешнем потоке пришло новое значение - переключается на новый внутренний Observable', () => {
      const values = { a: 10, b: 30, x: 20, y: 40 };
      const obs1 = cold('    -a-----a--b-|', values);
      const obs2 = cold('     a-a-a|', values);
      //                            a-a-a|
      //                               a-a-a|
      const expected = cold('-x-x-x-x-xy-y-y|', values);

      const result = obs1.pipe(
        switchMap((x) => obs2.pipe(map((y) => x + y)))
      );
      expect(result).toBeObservable(expected);
    });
  });

  // concatMap преобразует входящие значения во внутренние observable, 
  // но запускает их строго поочередно: следующий запускается только после завершения предыдущего. 
  // Сохраняется порядок испускания результатов.
  // Строгая последовательность запросов (chain of requests):
  // Например, нужно выполнить серию HTTP-запросов, где каждый следующий стартует 
  // только после успешного завершения предыдущего. 
  // Это часто бывает необходимо при зависимых действиях: 
  // создать запись, потом обновить её, потом получить результат.
  describe('concatMap', () => {
    it('пока предыдущий внутренний поток не завершился, не подписывается на следующий внутренний поток, обеспечивая тем самым последовательное выполнение по порядку', () => {
      const values = { a: 10, b: 30, x: 20, y: 40 };
      const obs1 = cold('    -a--------b------(ab)|', values);
      const obs2 = cold('     a-a-a|', values);
      //                               a-a-a|
      //                                      a-a-a|
      //                                           a-a-a|
      const expected = cold('-x-x-x----y-y-y--x-x-xy-y-y|', values);

      const result = obs1.pipe(
        concatMap((x) => obs2.pipe(map((y) => x + y)))
      );
      expect(result).toBeObservable(expected);
    });
  });

  // exhaustMap преобразует входящие значения во внутренние observable, 
  // но если предыдущий внутренний observable ещё не завершён, новые значения игнорируются до его завершения.
  describe('exhaustMap', () => {
    it('получив входящее значение мапит его на внутренний поток и игнорирует новые входящие значения, пока этот внутренний поток не завершится', () => {
      const values = { a: 10, b: 30, x: 20, y: 40 };
      const obs1 = cold('    -a--------b------ab|', values);
      const obs2 = cold('     a---a---a---a-|', values);
      //                               o
      //                                      a---a---a---a-|
      //                                       o
      const expected = cold('-x---x---x---x---x---x---x---x-|', values);
  
      const result = obs1.pipe(
        exhaustMap((x) => obs2.pipe(map((y) => x + y)))
      );
  
      expect(result).toBeObservable(expected);
    });
  });

  // Статья по теме операторов concatMap, mergeMap, exaustMap и switchMap:
  // https://habr.com/ru/articles/715882/

  // Статья по теме планировщиков:
  // https://habr.com/ru/articles/529000/
  

});
 