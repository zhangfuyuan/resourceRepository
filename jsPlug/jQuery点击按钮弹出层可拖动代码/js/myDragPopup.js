!(function ($, window, document, undefined) {

  if ($.fn.myDragPopup) return;

  var Plugin = function (elem, options) {
    this.$elem = elem;

	this.defaults = {
		ifDrag: true,
		dragLimit: true,
		titlePicker: '.title'
    };

	this.opts = $.extend({}, this.defaults, options);
    this.$oTitle = this.$elem.find(this.opts.titlePicker);
    this.page_w = $(window).width();
    this.page_h = $(window).height();

	console.log(8126, this.$elem, this.opts, this.$oTitle, this.page_w, this.page_h);
  };

  Plugin.prototype = {
    inital: function () { // 初始化
      var self = this;

      // 拖拽事件
      this.$oTitle.off('.myMouseDownDragTitle').on('mousedown.myMouseDownDragTitle', function (ev) {
        if (self.opts.ifDrag) {
          self.drag(ev);
        }

        return false;
      }).off('.myMouseUpDragTitle').on('mouseup.myMouseUpDragTitle', function () {
        _move = false;
		self.$oTitle.off('.myMouseDownDragTitle .myMouseUpDragTitle');
      });
    },

    drag: function (ev) { // 拖拽事件
      var self = this;
      var oEvent = ev || window.event;
      var disX = oEvent.clientX - this.$elem.offset().left;
      var disY = oEvent.clientY - this.$elem.offset().top;
      var _move = true;

      $(document).off('.myMouseMoveDragPopup').on('mousemove.myMouseMoveDragPopup', function (ev) {
		console.log(8126.1);
        if (_move) {
		  console.log(8126.2);
          var oEvent = ev || window.event;
          var offset_l = oEvent.clientX - disX;
          var offset_t = oEvent.clientY - disY;

          if (self.opts.dragLimit) {
            if (offset_l <= 0) {
              offset_l = 0;
            } else if (offset_l >= self.page_w - self.$elem.width()) {
              offset_l = self.page_w - self.$elem.width();
            }

            if (offset_t <= 0) {
              offset_t = 0;
            } else if (offset_t >= self.page_h - self.$elem.height()) {
              offset_t = self.page_h - self.$elem.height();
            }
          }

          self.$elem.css({left: offset_l, top: offset_t});
        }
      }).off('.myMouseUpDragPopup').on('mouseup.myMouseUpDragPopup', function () {
        _move = false;
		$(document).off('.myMouseMoveDragPopup .myMouseUpDragPopup');
      });
    },

    constructor: Plugin
  };

  $.fn.myDragPopup = function (options) {
    var plugin = new Plugin(this, options);

    return plugin.inital();
  };

})(window.jQuery, window, document);