// Firefoxのタブを開く位置をデフォで現在のタブの右隣にする（※ gBrowser.addTabの改造）
// http://d.hatena.ne.jp/wlt/20110112/1294859530
// gBrowser.addTab = liberator.eval(
    // '(' +
    // gBrowser.addTab.toSource()
            // .replace(/var aRelatedToCurrent;/, 'var aRelatedToCurrent = true;')
            // .replace(/aRelatedToCurrent = params\.relatedToCurrent;/, 'aRelatedToCurrent = params.relatedToCurrent === undefined ? true : params.relatedToCurrent;') +
    // ')',
    // gBrowser.addTab);
// EOM


// autocmd 駆動時のエコーをやめる
// http://vimperator.g.hatena.ne.jp/nokturnalmortum/20110616/1308191737
let (original = liberator.echomsg)
  liberator.echomsg = function (msg) {
    const REAC = RegExp('@chrome://liberator/content/autocommands\\.js:\\d+');
    if (Error().stack.split(/\n/).some(RegExp.prototype.test.bind(REAC)) && /Executing .* Auto commands for .*/.test(msg))
      liberator.log(msg);
    else
      original.apply(liberator, arguments);
  };


// Search Keywords
[['google blog search ','http://www.google.co.jp/#q=%s&tbm=blg','blog'],
  ['google us search','http://www.google.com/webhp?hl=us#&hl=en&q=%s','googleus'],
  ['google image search','http://www.google.com/images?&q=%s','image'],
  ['google reader search','http://www.google.com/reader/view/#search/%s/','greader'],
  ['github search','https://github.com/search?q=%s','github'],
  ['youtube search','http://www.youtube.com/results?search_query=%s','youtube'],
  ['twitter search','http://twitter.com/search?q=%s','twsearch'],
  ['twitter user','http://twitter.com/%s','twuser'],
  ['twilog user','http://twilog.org/%s','twilog'],
  ['favstar user','http://ja.favstar.fm/users/%s/given','favstar'],
  ['tumblelog search','http://www.google.com/search?q=site:sso775.tumblr.com+%s','tumblelog'],
  ['nico video search','http://www.nicovideo.jp/search/%s','nico'],
  ['tumblr dashboard search','http://www.tumblr.com/dashboard/search/%s','dashboard'],
  ['last.fm search','http://www.last.fm/search?q=%s','last.fm'],
  ['yahoo.com search','http://search.yahoo.com/search?p=%s','yahoo.com'],
  ['2ch search','http://www.google.com/search?q=site:2ch.net+%s','2ch']
].forEach(function (b) {
  if (!bookmarks.isBookmarked(b[1])) {
    bookmarks.add(false, b[0], b[1], b[2], ['vimp'], 'SearchKeywords', false);
  }
});


// vimpからはてブアドオン操作
// https://github.com/hatena/hatena-bookmark-xul/wiki/Vimperator-ではてなブックマーク拡張を使う
// http://d.hatena.ne.jp/ruedap/20110407/vimperator_hatena_bookmark_firefox_operation
if (typeof hBookmark != 'undefined') liberator.loadScript('chrome://hatenabookmark/content/vimperator/plugin/hatenabookmark.js', {__proto__: this});
liberator.globalVariables.hBookmark_shortcuts = {
  hintsAdd     : 'B',
  hintsComment : '',
  add          : [''],
  comment      : ['C'],
};


// コマンドラインで bang をトグル
// http://d.hatena.ne.jp/eagletmt/20100506/1273141081
mappings.addUserMap(
  [modes.COMMAND_LINE],
  ['<C-x>'],
  'toggle bang',
  function() {
    let [,cmd,bang,args] = commands.parseCommand(commandline.command);
    bang = bang ? '' : '!';
    commandline.command = cmd + bang + ' ' + args;
  });


// コマンドライン上でブックマークキーワードを展開
// http://vimperator.g.hatena.ne.jp/nokturnalmortum/20100515/1273924701
mappings.addUserMap(
  [modes.COMMAND_LINE],
  ['<C-o>'],
  'Expand bookmark keyword.',
  function ()
    let ([, cmd, bang, args] = commands.parseCommand(commandline.command))
      (commandline.command = commandline.command.replace(args, util.stringToURLArray(args).join(', ')))
);


// 指定の xpath でヒントを出して、選んだ物を削除する
// http://vimperator.g.hatena.ne.jp/nokturnalmortum/20100218/1266506228
let (hintName = 'foo-remove-node', shareArgs) {
  hints.addMode(
    hintName,
    'prompt text',
    function (elem, count) {
      elem.parentNode.removeChild(elem);
    },
    function () (shareArgs.literalArg || '//div')
  );

  commands.addUserCommand(
    ['removenode'],
    'description',
    function (args) {
      shareArgs = args;
      hints.show(hintName);
    },
    {
      literal: 0
    },
    true
  );
}


// マウスオーバーするヒントモード
// http://vimperator.g.hatena.ne.jp/nokturnalmortum/20100131/1264923630
hints.addMode(
  'j',
  'mouse over',
  function (elem, count) {
    let evt = elem.ownerDocument.createEvent('MouseEvents');
    evt.initMouseEvent(
      'mouseover',
      true, true,
      elem.ownerDocument.defaultView,
      0, 0, 0, 0, 0,
      false, false, false, false, 0, null
    );
    elem.dispatchEvent(evt);
  },
  function () options.get('hinttags').get()
);


// 素因数分解
// 誰特
commands.addUserCommand(
    ['fac[tor]'],
    'factorization in prime numbers',
    function(args) {
        let p=1,q,n=args[0],s='';
        while(++p && n-1){
            for(q=0;!(n%p);++q,n/=p);
            s+=q?(p+'^'+q+((n-1)?'*':'\n')):'';
        }
        liberator.echo(s);
    }
);


// URL整形
commands.addUserCommand(
    ["urlcut"],
    "url smarter",
    function (args) {
        let url = buffer.URL;
        if ( url.match(/\?.+$|touch\/|lite\//) ) {
            url = url.replace(/\?.+$|touch\/|lite\//g,'');
            liberator.open(url, liberator.CURRENT_TAB);
        }
    }
);



if (!liberator.globalVariables.rc_js_loaded) {
  liberator.globalVariables.rc_js_loaded = true;
};
