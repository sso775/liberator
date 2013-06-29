

var GooglePlus = null,
    PostData = null;

(function init() {
  if (typeof plugins.googlePlus == "undefined") {
    window.setTimeout(init, 500);
  } else {
    GooglePlus = plugins.googlePlus;
    PostData = GooglePlus.PostData;

    function isLocalImage (aWindow, aImageURL) {
      if (!aImageURL || aImageURL.indexOf("http") == 0)
        return false;

      var file = io.File(aImageURL);
      if (file.exists() && file.isReadable()) {
        let mime = "text/plain"
        try {
          mime = GooglePlus.MIME.getTypeFromFile(file);
        } catch(e) {}
        if (/^image\//.test(mime))
          return true;
      }
      return false;
    }

    var proto = {
      // override commonProto
      init: function (win, imageURL) {
        this.window = win;
        this.file = io.File(imageURL);
        if (this.file.exists() && this.file.isReadable()) {
          this.uploading = true;
          this.start();
        } else {
          throw new Error();
        }
      },
      // override commonProto
      generateData: function () {
        // Picasa へのアップロード終了までスレッド待ち
        while (this.uploading)
          liberator.threadYield(false, true);

        if (this.mediaData)
          return this.mediaData;

        return [];
      },
      get sequence () {
        var s = PostData.sequence++;
        return s;
      },
      get reqid () {
        var date = new Date;
        var r = date.getHours() + 3600 + date.getMinutes() + 60 + date.getSeconds() + this.sequence * 100000;
        return r;
      },
      uploading: false,
      resumableURL_BASE: "https://plus.google.com/_/upload/photos/resumable",
      start: function startSession () {
        var f = this.file;
        var query = JSON.stringify({
          protocolVersion: "0.8",
          createSessionRequest: {
            fields: [
              { external: { name: "file", filename: f.leafName, put: {}, size: f.fileSize } },
              { inlined:  { name: "batchid",                   content: "" + Date.now(), contentType: "text/plain" } },
              { inlined:  { name: "disable_asbe_notification", content: "true",          contentType: "text/plain" } },
              { inlined:  { name: "streamid",                  content: "updates",       contentType: "text/plain" } },
              { inlined:  { name: "use_upload_size_pref",      content: "true",          contentType: "text/plain" } }
            ]
          }
        });
        var xhr = new XMLHttpRequest();
        xhr.mozBackgroundRequest = true;
        xhr.open("POST", this.resumableURL_BASE + "?authuser=0", true);
        xhr.onload = this.upload.bind(this);
        xhr.send(query);
      },
      upload: function (evt) {
        var res = evt.target;
        if (res.status != 200)
          throw res.statusText;

        var status = JSON.parse(res.responseText).sessionStatus;
        //liberator.log(status, 0);
        var URL = this.resumableURL_BASE + "?" + [
          "upload_id=" + status.upload_id,
          "file_id=000"
        ].join("&");

        var stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
        stream.init(this.file, 0x04 | 0x08, parseInt("0644", 8), 0x04);
        var mimeType = "image/jpeg";
        try {
          mimeType = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService).getTypeFromFile(this.file);
        } catch(e) {}

        var xhr = new XMLHttpRequest();
        xhr.mozBackgroundRequest = true;
        xhr.upload.addEventListener("progress", function (evt) {
          var xhr = evt.target,
              msg = "Uploading to Picasa ... ";
          if (evt.lengthComputable) {
            msg += Math.round(evt.locaed / evt.total * 100) + " %";
          }
          window.XULBrowserWindow.setJSDefaultStatus(msg);
        }, false);
        xhr.open("POST", URL, true);
        xhr.onload = this.end.bind(this);
        xhr.send(stream);
      },
      end: function (evt) {
        var res = evt.target;
        if (res.status != 200)
          throw res.statusText;

        window.XULBrowserWindow.setJSDefaultStatus("Done");
        var status = JSON.parse(res.responseText).sessionStatus;
        //liberator.log(status, 0);
        var q = {
          sm: JSON.stringify([this.getSMLQuery(status)]),
          susp: "false",
          at: GooglePlus.store.get("AT", ""),
        };
        var query = [key + "=" + encodeURIComponent(q[key]) for (key in q)].join("&");
        var reqid = this.reqid;
        var URL = "https://plus.google.com/_/sharebox/medialayout/?_reqid=" + reqid + "&rt=j";
        var xhr = new XMLHttpRequest;
        xhr.open("POST", URL, true);
        var self = this;
        xhr.onload = function () {
          self.uploading = false;
        };
        xhr.send(query);
      },
      getSMLQuery: function (status) {
        var d = new Array(48);
        d[3] = "";
        var cSI = status.additionalInfo["uploader_service.GoogleRupioAdditionalInfo"].completionInfo.customerSpecificInfo;
        d[5] = [null, cSI.url, cSI.height, cSI.width];
        d[9] = [];
        d[21] = cSI.title;
        d[24] = [null, cSI.photoPageUrl, null, cSI.mimeType, "image"];
        var a = [null, cSI.url, 120, cSI.width / cSI.height * 120];
        d[41] = [a, a];
        d[47] = [
          [null, "picasa", "http://google.com/profiles/media/provider"],
          [null, "albumid=" + cSI.albumid + "&photoid=" + cSI.photoid, "http://google.com/profiles/media/onepick_media_id"]
        ];
        return this.mediaData = d;
      },
    };

    GooglePlus.mediaDetector.addType("picasaUploader", isLocalImage, proto);

    (function (cmd) {
      var imgOption = cmd.options[1];
      imgOption[3] = function (context, args) {
        completion.file(context, true);
        return context.items;
      }
    })(commands.getUserCommand("googleplus"));
  }
})();

// vim: sw=2 ts=2 et:
