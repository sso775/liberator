let INFO = <>
<plugin name="GooglePlusPoster" version="0.1"
        summary="Post to Google+"
        lang="en-US"
        xmlns="http://vimperator.org/namespaces/liberator">
  <author email="teramako@gmail.com">teramako</author>
  <license>MPL 1.1</license>
  <project name="Vimperator" minVersion="3.0"/>
  <item>
    <tags>:googleplus-setup</tags>
    <spec>:googleplus -setup</spec>
    <spec>:gp -setup</spec>
    <description>
      <p>Should setup at first</p>
      <ol>
        <li>Login to <a href="htts://plus.google.com/">Google+</a></li>
        <li>Execute <ex>:googleplus -setup</ex></li>
      </ol>
    </description>
  </item>
  <item>
    <tags>:googleplus-nonargs</tags>
    <spec>:googleplus</spec>
    <spec>:gp</spec>
    <description>
      <p>when argument is none, select the Google+ tab or open in new tab</p>
    </description>
  </item>
  <item>
    <tags>:googleplus :gp</tags>
    <spec>:googleplus <oa>-l[link]</oa> <oa>-i[mage] <a>imageURL</a></oa> <oa>-t[o] <a>to</a></oa> <a>message</a></spec>
    <spec>:gp <oa>-l[ink]</oa> <oa>-i[mage] <a>imageURL</a></oa> <oa>-t[o]> <a>to</a></oa> <a>message</a></spec>
    <description>
      <p>Post <a>message</a></p>
      <dl>
        <dt>-link</dt>
        <dd>
          Add the current URL. If the selections are available, add the selections as relataed page.
          And when <a>-image</a> option is not specified and image elements is contained in the selections,
          add the URL of the largest image.
        </dd>
        <dt>-image</dt>
        <dd>
          Specify image URL
        </dd>
        <dt>-to</dt>
        <dd>
          Specify the circles. Can set multiple. (Default: Anyone)
        </dd>
      </dl>
    </description>
  </item>
</plugin>
</>;

var HOME_URL = "https://plus.google.com/",
    POST_URL_BASE = "https://plus.google.com/u/0/_/sharebox/post/";

/**
 * ${RUNTIMEPATH}/info/{profileName}/googlePlus のデータ取得/保存
 * @type {Object}
 */
var store = storage.newMap("googlePlus", { store: true });

// -------------------------------------------------------------------------
// Command
// ----------------------------------------------------------------------{{{
commands.addUserCommand(["gp", "googleplus"], "Google+",
  function (args) {
    // ----------------------
    // -setup オプション
    // ----------------------
    if ("-setup" in args) {
      setupGooglePlus();
      return;
    }

    var message = args[0] || "",
        acls = null;

    // ----------------------
    // -link オプション
    // ----------------------
    var win = null;
    if ("-link" in args) {
      win = content;
    }
    // ----------------------
    // -imageURL オプション
    // ----------------------
    var image = null;
    if ("-imageURL" in args) {
      image = args["-imageURL"];
    }

    // ----------------------
    // -to オプション
    // ----------------------
    if ("-to" in args && args["-to"].indexOf("anyone") == -1)
      acls = [acl for ([,acl] in Iterator(store.get("CIRCLES", []))) if (args["-to"].indexOf(acl[0]) != -1)];

    // 引数が何も無い場合は、Google+のページへ
    if (!message && !win && !image) {
      let tab = getGooglePlusTab();
      if (tab)
        gBrowser.mTabContainer.selectedItem = tab;
      else
        liberator.open(HOME_URL, { where: liberator.NEW_TAB });

      return;
    }
    var pd = new PostData(message, win, image, acls);
    postGooglePlus(pd);
  }, {
    literal: 0,
    options: [
      [["-link", "-l"], commands.OPTION_NOARG],
      [["-imageURL", "-i"], commands.OPTION_STRING],
      [["-to", "-t"], commands.OPTION_LIST, null,
        function (context, args) {
          let [, prefix] = context.filter.match(/^(.*,)[^,]*$/) || [];
          if (prefix)
            context.advance(prefix.length);

          return [["anyone", "to public"]].concat([v for ([,v] in Iterator(store.get("CIRCLES", [])))]);
        }],
      [["-setup"], commands.OPTION_NOARG],
    ],
  },true);
// }}}

// -------------------------------------------------------------------------
// Hint
// ----------------------------------------------------------------------{{{
hints.addMode("G", "Google+ Post",
  function action(elm) {
    var src = elm.src;
    commandline.open("", "googleplus -i " + src + " ", modes.EX);
  },
  function getPath() {
    return util.makeXPath(["img"]);
  });
// }}}

/**
 * Google+のページから必要データを保存する
 * @return {Boolean}
 */
function setupGooglePlus () {
  var tab = getGooglePlusTab();
  if (tab) {
    let data = tab.linkedBrowser.contentWindow.wrappedJSObject.OZ_initData;
    if (data) {
      store.set("UID", data[2][0]);
      store.set("AT", data[1][15]);
      let circles = data[12][0];
      // CIRCLES[]: [[Name, Description, ID], ...]
      store.set("CIRCLES", circles.slice(0, circles.length / 2).map(function (c) [c[1][0], c[1][2], c[0][0]]));
      liberator.echomsg("Initialized: googleplus");
      return true;
    }
  }
  liberator.echoerr("Faild: initialize googleplus");
  return false;
}

/**
 * Google+のタブを取ってくる
 * @return {Element|null}
 */
function getGooglePlusTab () {
  var tabs = gBrowser.tabs;
  for (let i = 0, tab; tab = tabs[i]; ++i) {
    if (tab.linkedBrowser.currentURI.spec.indexOf(HOME_URL) == 0) {
      return tab;
    }
  }
  return null;
}

/**
 * Post to Google+
 * @param {PostData} aPostData
 */
function postGooglePlus (aPostData) {
  var data = aPostData.getPostData();
  var queries = [];
  for (let key in data)
    queries.push(key + "=" + encodeURIComponent(data[key]));

  var xhr = new XMLHttpRequest();
  xhr.mozBackgroundRequest = true;
  xhr.open("POST", aPostData.POST_URL, true);
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
  xhr.setRequestHeader("Origin", HOME_URL);
  xhr.onreadystatechange = postGooglePlus.readyStateChange;
  xhr.send(queries.join("&"));
}
/**
 * Google+への送信状況を表示する
 * @param {Event} aEvent
 *                aEvent.target は XMLHttpRequestオブジェクト
 */
postGooglePlus.readyStateChange = function GooglePlus_readyStateChange (aEvent) {
  var xhr = aEvent.target,
      msg = "Google+: ",
      XBW = window.XULBrowserWindow;
  if (xhr.readyState == 4) {
    msg += (xhr.status == 200) ? "Posted" : "Post faild (" + xhr.statusText + ")";
    window.setTimeout(function(XBW, msg){
      if (XBW.jsDefaultStatus.indexOf("Google+:") == 0)
        XBW.setJSDefaultStatus("");
    }, 2000, XBW, msg);
  } else {
    msg += "sending...";
  }
  liberator.log(msg, 0);
  XBW.setJSDefaultStatus(msg);
};

XPCOMUtils.defineLazyServiceGetter(this, "MIME", "@mozilla.org/mime;1", "nsIMIMEService");

/**
 * Google+への送信データ生成
 * @Constructor
 * @param {String}    aMessage
 * @param {Object}    aPage             現ページのコンテンツ情報
 * @param {Selection} [aPage.selection] 選択オブジェクト
 * @param {String}    [apage.title]     現ページのタイトル
 * @param {String}    [aPage.url]       現ページURL
 * @param {String}    [aPage.image]     表示させたい画像URL
 * @param {Array}     aACLs             ACL[]
 */
function PostData () { this.init.apply(this, arguments); }
PostData.sequence = 0;
PostData.prototype = {
  init: function PD_init (aMessage, aWindow, aImageURL, aACLs) {
    this.message = aMessage;
    this.window = aWindow;
    this.imageURL = aImageURL;

    this.UID = store.get("UID", null);
    liberator.assert(this.UID, "Google+ Error: UID is not set. Please login and `:googleplus -init'");
    this.AT = store.get("AT", null);
    liberator.assert(this.AT, "Google+ Error: AT is not set. Please login and `:googleplus -init'");

    this.setACLEnties(aACLs);
  },
  get token () {
    var t = "oz:" + this.UID + "." + this.date.getTime().toString(16) + "." + this.sequence.toString(16);
    Object.defineProperty(this, "token", { value: t, });
    return t;
  },
  get date () {
    var d = new Date;
    Object.defineProperty(this, "date", { value: d, });
    return d;
  },
  get sequence () {
    var s = PostData.sequence++;
    Object.defineProperty(this, "sequence", { value: s });
    return s;
  },
  get reqid () {
    var r = this.date.getHours() + 3600 + this.date.getMinutes() + 60 + this.date.getSeconds() + this.sequence * 100000;
    Object.defineProperty(this, "reqid", { value: r });
    return r;
  },
  get POST_URL () {
    var url = POST_URL_BASE + "?_reqid=" + this.reqid + "&rt=j";
    Object.defineProperty(this, "POST_URL", { value: url });
    return url
  },
  aclEntries: [{
    scope: {
      scopeType: "anyone",
      name: "Anyone",
      id: "anyone",
      me: true,
      requiresKey: false
    },
    role: 20,
  }, {
    scope: {
      scopeType: "anyone",
      name: "Anyone",
      id: "anyone",
      me: true,
      requiresKey: false,
    },
    role: 60
  }],
  setACLEnties: function PD_setACLEnties (aACLs) {
    if (!aACLs || aACLs.length == 0)
      return this.aclEntries = Object.getPrototypeOf(this).aclEntries;

    var entries = [];
    for (let i = 0, len = aACLs.length; i < len; ++i) {
      let acl = aACLs[i];
      let scope = {
        scopeType: "focusGroup",
        name: acl[0],
        id: this.UID + "." + acl[2],
        me: false,
        requiresKey: false,
        groupType: "p"
      };
      entries.push({ scope: scope, role: 60 });
      entries.push({ scope: scope, role: 20 });
    }
    return this.aclEntries = entries;
  },
  getPostData: function PD_getPostData () {
    var spar = [v for each(v in this.generateSpar())];
    return {
      spar: JSON.stringify(spar),
      at  : this.AT
    };
  },
  generateSpar: function PD_generateSpar() {
    for (let i = 0, len = 17; i < len; ++i) {
      switch (i) {
      case 0:
        yield this.message;
        break;
      case 1:
        yield this.token;
        break;
      case 6: 
        if (!this.window && !this.imageURL) {
          yield null;
        } else {
          var media = mediaDetector.get(this.window, this.imageURL);
          var data = [JSON.stringify(media.generateData())];
          if (media.hasPhoto) {
            data.push(JSON.stringify(media.generateData(true)));
          }
          yield JSON.stringify(data);
        }

        break;
      case 8:
        yield JSON.stringify({ aclEntries: this.aclEntries });
        break;
      case 9:
      case 11:
      case 12:
        yield true;
        break;
      case 15:
      case 16:
        yield false;
        break;
      case 10:
      case 14:
        yield [];
        break;
      default:
        yield null;
        break;
      }
    }
  },
};

/**
 * ノードをHTMLテキストに変換
 * @param {Node} aNode
 * @param {String} [aParentTag] 親ノードのタグ名
 * @param {String} [aIndent]    インデント文字列
 * @param {Number} [aIndex]     ノード番号(ol>li 時のみ使用)
 * @return {String}
 */
function node2txt (aNode, aParentTag, aIndent, aIndex) {
  var txt = "";
  switch (aNode.nodeType) {
  case Node.DOCUMENT_NODE: // 9
  case Node.DOCUMENT_FRAGMENT_NODE: // 11
    switch (aParentTag) {
    case "ol":
    case "ul":
    case "dl":
      aIndent = "&nbsp;&nbsp;";
      break;
    default:
      aIndent = "";
    }
    txt = nodelist2txt(aNode.childNodes, aParentTag, aIndent).join("");
    break;
  case Node.TEXT_NODE: // 3
    txt = aNode.nodeValue.replace(/\s+/g, " ");
    break;
  case Node.ELEMENT_NODE: // 1
    let localName = aNode.localName,
        children = aNode.childNodes;
    switch (localName) {
    case "ul":
    case "ol":
    case "dl":
      txt = "<br/>\n" + nodelist2txt(children, localName, aIndent + "&nbsp;&nbsp;").join("");
      break;
    case "li":
      txt = aIndent + (aParentTag == "ol" ? ("  " + (aIndex+1)).slice(-2) + ". " : " * ").replace(" ", "&nbsp;", "g") +
            nodelist2txt(children, "li", aIndent).join("") +
            "<br/>\n";
      break;
    case "dt":
      txt = aIndent + "<b>" + nodelist2txt(children, localName, aIndent) + "</b>:<br/>\n";
      break;
    case "dd":
      txt = aIndent + "&nbsp;&nbsp;" + nodelist2txt(children, localName, aIndent) + "<br/>\n";
      break;
    case "br":
      txt = "<br/>\n";
      break;
    case "img":
      txt = "<img src=" + aNode.src.quote() + " width=\"" + aNode.width + "\" height=\"" + aNode.height + "\"/>";
      break;
    case "p":
      txt = nodelist2txt(children, "p", "").join("") + "<br/>\n";
      break;
    case "a":
      if (aNode.hasAttribute("href") && aNode.href.indexOf("http") == 0) {
        txt = "<a href=" + aNode.href.quote() + (aNode.title ? " title=" + aNode.title.quote() : "") + ">" +
              nodelist2txt(children, "a", "").join("") +
              "</a>";
        break;
      }
    default:
      txt = '<' + localName + '>' +
            nodelist2txt(children, localName, aIndent).join("") +
            '</' + localName + '>';
    }
    break;
  }
  return txt;
}

/**
 * NodeListの子をテキストにして配列で返す
 * @param {NodeList} aChildNoes
 * @param {String} aParentTag
 * @param {String} aIndent
 * @return {String[]}
 */
function nodelist2txt (aChildNodes, aParentTag, aIndent) {
  var a = [], index = 0;
  for (let i = 0, len = aChildNodes.length, child; child = aChildNodes[i]; ++i){
    let txt = node2txt(child, aParentTag, aIndent, index);
    if (txt) {
      a.push(txt);
      ++index;
    }
  }
  return a;
}


var mediaDetector = (function() {
  var commonProto = {
    init: function (win, imageURL) {
      this.window = win;
      this.imageURL = imageURL;
      if (imageURL) {
        if (win)
          this.hasPhoto = true;

        this.setupImage();
      }
    },
    type: {
      TITLE: 3,
      MEDIA_LINK: 5,
      UPLOADER: 9,
      TEXT: 21,
      TYPE: 24,
      IMAGE: 41,
      PROVIDER: 47,
    },
    generateData: function (isPhoto) {
      var data = new Array(48);
      data[this.type.TITLE] = this.getTitle(isPhoto);
      data[this.type.MEDIA_LINK] = this.getMediaLink(isPhoto);
      data[this.type.UPLOADER] = this.getUploader(isPhoto);
      data[this.type.TEXT] = this.getContentsText(isPhoto);
      data[this.type.TYPE] = this.getMediaType(isPhoto);
      data[this.type.IMAGE] = this.getMediaImage(isPhoto);
      data[this.type.PROVIDER] = this.getProvider(isPhoto);
      return data;
    },
    hasPhoto: false,
    imageElement: null,
    setupImage: function () {
      let imgs = content.document.images;
      for (let i = 0, len = imgs.length, img; img = imgs[i]; ++i) {
        if (img.src == this.imageURL) {
          this.imageElement = img;
        }
      }
    },
    getMimeType: function (uri, defaultType) {
      if (!(uri instanceof Ci.nsIURI))
        uri = util.createURI(uri);

      try {
        return MIME.getTypeFromURI(uri);
      } catch (e) {}
      return defaultType;
    },
    getTitle: function (isPhoto) {
      return (isPhoto || !this.window) ? null : this.window.document.title;
    },
    getContentsText: function (isPhoto) {
      if (!this.window || isPhoto)
        return null;

      var sel = this.window.getSelection();
      if (sel.isCollapsed)
        return "";

      var sels = [];
      for (let i = 0, count = sel.rangeCount; i < count; ++i) {
        let r = sel.getRangeAt(i),
            fragment = r.cloneContents();
        sels.push(node2txt(fragment, r.commonAncestorContainer.localName));
      }
      return sels.join("<br/>(snip)<br/>");
    },
    getUploader: function () { return []; },
    getMediaLink: function (isPhoto) {
      if (this.window && !isPhoto)
        return [null, this.window.location.href];

      var data = [null, this.imageURL];
      if (this.imageElement)
        data.push(this.imageElement.height, this.imageElement.width);

      return data;
    },
    getMediaType: function (isPhoto) {
      if (isPhoto) {
        var type = this.getMimeType(this.imageURL, "image/jpeg");
        var data = [null, this.imageURL, null, type, "photo", null,null,null,null,null,null,null];
        if (this.imageElement)
          data.push(this.imageElement.width, this.imageElement.height);
        else
          data.push(null,null);

        return data;
      }
      if (this.window && !isPhoto) {
        type = this.window.document.contentType;
        switch (type.split("/")[0]) {
        case "image":
          return [null, this.window.location.href, null, type, "image"];
        case "text":
        default:
          return [null, this.window.location.href, null, "text/html", "document"];
        }
      } else if (this.imageURL) {
        type = this.getMimeType(this.imageURL, "image/jpeg");
        return [null, this.imageURL, null, type, "image"];
      }
      return null
    },
    getMediaImage: function (isPhoto) {
      var url;
      if (this.window && !isPhoto) {
        let type = this.window.document.contentType.split("/");
        if (type[0] != "image") {
          let host = this.window.location.host;
          url = "//s2.googleusercontent.com/s2/favicons?domain=" + host;
          return [ [null, url, null, null], [null, url, null, null] ];
        } else {
          url = this.window.location.href;
          return [ [null, url, null, null], [null, url, null, null] ];
        }
      }

      let data = [null, this.imageURL];
      let w = null, h = null;
      if (this.imageElement) {
        w = this.imageElement.width, h = this.imageElement.height;
        w = w / h * 120;
        h = 120;
      }
      data.push(h, w);
      return [ data, data ];
    },
    getProvider: function (isPhoto) {
      return [ [null, (isPhoto ? "images" : ""), "http://google.com/profiles/media/provider"] ];
    }
  };
  var classes = {}, checker = {};
  function MediaLink() { this.init.apply(this, arguments); };
  MediaLink.prototype = commonProto;

  var self = {
    addType: function (name, checkFunc, proto) {
      checker[name] = checkFunc;
      var func = function () { this.init.apply(this, arguments); };
      proto.__super__ = proto.__proto__ = commonProto;
      func.prototype = proto;
      classes[name] = func;
    },
    get: function (aWindow, aImageURL) {
      for (let [key, checkFunc] in Iterator(checker)) {
        if (checkFunc(aWindow, aImageURL)) {
          return new classes[key](aWindow, aImageURL);
        }
      }
      return new MediaLink(aWindow, aImageURL);
    }
  };

  (function() {
    // -------------------------------------------------------------------------
    // YouTube
    // ----------------------------------------------------------------------{{{
    self.addType("youtube",
      function (win) {
        if (!win) return false;

        return /^https?:\/\/(?:.*\.)?youtube.com\/watch/.test(win.location.href);
      }, {
        get VIDEO_ID () {
          var id = this.window.wrappedJSObject.yt.config_.VIDEO_ID;
          Object.defineProperty(this, "VIDEO_ID", { value: id });
          return id;
        },
        getMediaLink: function () {
          return [null, "http://www.youtube.com/v/" + this.VIDEO_ID + "&hl=en&fs=1&autoplay=1"];
        },
        getContentsText: function () {
          return this.window.document.querySelector("meta[name=description]").content;
        },
        getMediaType: function () [null, this.window.location.href, null, "application/x-shockwave-flash", "video"],
        getMediaImage: function () {
          var url = "https://ytimg.googleusercontent.com/vi/" + this.VIDEO_ID + "/hqdefault.jpg";
          return [ [null, url, 120, 160], [null, url, 120, 160] ];
        },
        getProvider: function () [ [null, "youtube", "http://google.com/profiles/media/provider"] ],
      }); // }}}
    // -------------------------------------------------------------------------
    // NicoNico
    // ----------------------------------------------------------------------{{{
    self.addType("nicovideo",
      function (win) {
        if (!win) return false;
        var reg = /^http:\/\/www.nicovideo.jp\/watch\/sm[\d]+/;
        return reg.test(win.location.href);
      }, {
        get VIDEO () {
          var video = this.window.wrappedJSObject.Video;
          Object.defineProperty(this, "VIDEO_ID", { value: video });
          return video;
        },
        getMeidLink: function () {
          return [null, "http://www.nicovideo.jp/watch/" + this.VIDEO.id];
        },
        getContentsText: function () {
          return this.VIDEO.description;
        },
        getMediaType: function () {
          return [null, this.window.location.href, null, "application/x-shockwave-flash", "video"];
        },
        getMediaImage: function () {
          var url = this.VIDEO.thumbnail;
          return [ [null, url, 120, 160], [ null, url, 120, 160] ];
        },
        getProvider: function () {
          return [[null, "nicovideo", "http://google.com/profiles/media/provider"]];
        }
      }); // }}}
    // -------------------------------------------------------------------------
    // Gyazo
    // ----------------------------------------------------------------------{{{
    self.addType("gyazo",
      function (win, image) {
        var reg = /^http:\/\/gyazo\.com\/\w+(\.png)?/;
        return reg.test(image);
      }, {
        init: function (win, imageURL) {
          this.window = win;
          if (imageURL.lastIndexOf(".png") != imageURL.length - 4)
            imageURL += ".png";

          this.imageURL = imageURL;
          this.hasPhoto = true;
        },
      });
    // }}}
  })();
  return self;
})();

// vim: sw=2 ts=2 et fdm=marker:
