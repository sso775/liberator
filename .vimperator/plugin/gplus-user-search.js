
(function () {

  const Head = 'https://plus.google.com/complete/search?ds=es_profiles&client=es-profiles&partnerid=es-profiles&authuser=0&xhr=t&q=';

  function completer (context, args) {
    let word = args.literalArg;
    if (word.length <= 0)
      return;

    context.filters = [CompletionContext.Filter.textAndDescription];
    context.anchored = false;
    context.incomplete = true;
    context.title = ['Hidden', 'User'];

    context.createRow = function(item, highlightGroup) {
      if (item.item) {
        let [g, name, p] = item.item;
        return <div highlight={highlightGroup || "CompItem"} style="white-space: nowrap">
            <li highlight="CompDesc">
              <img src={'http:' + p} style="max-width: 48px; max-height: 48px"/>
              &#160;{name}
            </li>
        </div>;
      }

      let desc = item[1] || this.process[1].call(this, item, item.description);
      return <div highlight={highlightGroup || "CompItem"} style="white-space: nowrap">
          <li highlight="CompDesc">{desc}&#160;</li>
      </div>;
    };

    util.httpGet(
      Head + encodeURIComponent(word),
      function (xhr) {
        context.incomplete = false;
        let sandbox = new Components.utils.Sandbox("about:blank");
        let res = Components.utils.evalInSandbox(xhr.responseText, sandbox);
        let users = res[0];
        context.completions = res[1].map(function (user) {
          let [name, , , [{g, p}]] = user;
          return ['https://plus.google.com/' + g, name, p];
        });
      }
    );
  }

  commands.addUserCommand(
    ['guser'],
    'Search Google+ User and open the pages',
    function (args) {
      liberator.open(args.literalArg);
    },
    {
      literal: 0,
      completer: completer
    },
    true
  );

})();
