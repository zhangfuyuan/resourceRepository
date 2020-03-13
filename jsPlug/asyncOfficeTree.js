/**
 * 异步请求机构树插件，依赖jQuery、jQuery-zTree、jQuery-nicescroll
 * */

(function(window, $) {

  // 构造函数
  function AsyncOfficeTree(arg) {
    if (!$ || !$.fn.zTree || !$.fn.niceScroll) {
      throw new Error('使用本插件前必须引入 jQuery、jQuery-zTree、jQuery-nicescroll 等依赖包！');
      return;
    }

    if (!arg.domSelector || !arg.domWrapSelector || !arg.ajaxParams) {
      throw new Error('传入的参数中必须有 domSelector、domWrapSelector、ajaxParams 等！');
      return;
    }

    // 生成树的DOM节点选择器
    this.domSelector = arg.domSelector || '#tree';
    // 滚动、加载时树外层的DOM节点选择器
    this.domWrapSelector = arg.domWrapSelector || '#Default';
    // 生成树的数据
    this.zNodes = null;
    // 初始化后缓存zTree对象
    this.zTreeObj = null;
    // 异步请求参数
    this.ajaxParams = $.extend(true, {
      url: '/apm-web/a/terminalMonitor/ajaxTerminalOfficeZtreeJson',
      type: 'POST',
      dataType: 'json',
      data: {},
      dynamicData: {}
    }, arg.ajaxParams || {});
    // 异步请求成功的关键字
    this.ajaxSuccessKey = $.extend(true, {
      flagKey: 'isSuccess',
      flagVal: '1',
      dataKey: 'officeList',
      pageSize: 'pageSize',
      pageNo: 'pageNo',
      officeTotal: 'total'
    }, arg.ajaxSuccessKey || {});
    // 生成树的设置选项，async 选项暂时无用
    this.zTreeSetting = $.extend(true, {
      async: {
        enable: true,
        url: this.ajaxParams.url,
        autoParam: ['id']
      },
      data: {
        simpleData: {
          enable: true
        }
      },
      view: {
        expandSpeed: ''
      },
      callback: {
        onCollapse: this._onCollapse.bind(this),
        onExpand: this._onExpand.bind(this)
      }
    }, arg.zTreeSetting || {});

    if (arg.zTreeSetting && arg.zTreeSetting.callback) {
      if (arg.zTreeSetting.callback.hasOwnProperty('onCollapse')) {
        this.customOnCollapse = arg.zTreeSetting.callback.onCollapse;
        this.zTreeSetting.callback.onCollapse = this._onCollapse.bind(this);
      }

      if (arg.zTreeSetting.callback.hasOwnProperty('onExpand')) {
        this.customOnExpand = arg.zTreeSetting.callback.onExpand;
        this.zTreeSetting.callback.onExpand = this._onExpand.bind(this);
      }
    }

    // 生成树前的初始数据
    this.initZNodes = arg.initZNodes || [];
    // 调用绘制树前绑定执行函数
    this.beforeRenderTreeFn = arg.beforeRenderTreeFn;
    // 调用绘制树后绑定执行函数
    this.afterRenderTreeFn = arg.afterRenderTreeFn;
    // 是否初始化时就加载全部机构的数据
    this.isAllLoad = typeof(arg.isAllLoad) === 'undefined' ? true : arg.isAllLoad;
    // 是否不统计总数，若是不统计总数，当请求到空数组时则表示已加载全部并结束请求
    this.isNotCountTotal = typeof(arg.isNotCountTotal) === 'undefined' ? true : arg.isNotCountTotal;
    // 是否请求结束，只有不统计总数时才会用到
    this.isAjaxAllEnd = false;
    // 滚动懒加载配置项（采取滚动懒加载的话，请确保节点的顺序是父前子后）
    this.scrollSettings = $.extend(true, {
      enable: this.isAllLoad ? false : true, // 是否启用滚动懒加载
      bottomLimit: 0.95, // 滚动到相对位置触发加载，最大值为1代表滚动至底部
      autohidemode: true, // 鼠标悬浮区域才显示滚动条,且过会自动消失
      zfyBoxPosition: 'absolute' // loading定位选项
    }, arg.scrollSettings || {});
    // 每页请求数量
    this.pageSize = arg.pageSize || 100;
    // 当前请求页码
    this.pageNo = 0;
    // 当前请求获得的一页机构数据
    this.pageZNodes = [];
    // 总机构树（请求后才知道）
    this.officeTotal = typeof(arg.officeTotal) === 'undefined' ? 0 : arg.officeTotal;
    // 重构机构数据
    this.refactorZNodesFn = arg.refactorZNodesFn;
    // 加载过程显示loading图标资源
    this.loadingIconUrl = arg.loadingIconUrl || '/apm-web/static/images/point_loading.gif';
    this.isLoading = false;

    this._init();
  }

  // 初始化的方法（每个实例对象仅调用一次）
  AsyncOfficeTree.prototype._init = function() {
    if ($(this.domSelector).length && $(this.domWrapSelector).length) {
      var self = this;

      this.zNodes = this.initZNodes;
      this._beforeRenderTreeFn();
      $(this.domWrapSelector).niceScroll({
        cursorborder: '',
        cursorcolor: '#cccccc',
        boxzoom: false,
        background: '#efefef',
        cursorwidth: '8px',
        autohidemode: this.scrollSettings.autohidemode,
        dblclickzoom: false
      });

      if (this.isAllLoad) {
        var _beforeGetAllNodesLen = this.zNodes.length;

        $.when(this._ajaxGetAllNodes()).then(function() {
          if (self.zNodes.length > _beforeGetAllNodesLen) {
            self._renderTree();
          }

          self._afterRenderTreeFn();
        });
      } else {
        $.when(this._ajaxGetNodes()).then(function() {
          self._renderTree();

          if (self.scrollSettings.enable) {
            self._scrollGetNodes();
          }

          self._afterRenderTreeFn();
        });
      }
    } else {
      console.log('找不到生成树的DOM节点！');
    }
  };

  // 重新初始化的方法（公开）
  AsyncOfficeTree.prototype.reInit = function() {
    var self = this;

    this._clear();
    this.zNodes = this.initZNodes;
    this.isAjaxAllEnd = false;
    this.pageNo = 0;
    this.pageZNodes = [];
    this.isLoading = false;
    this._beforeRenderTreeFn();

    if (this.isAllLoad) {
      var _beforeGetAllNodesLen = this.zNodes.length;

      $.when(this._ajaxGetAllNodes()).then(function() {
        if (self.zNodes.length > _beforeGetAllNodesLen) {
          self._renderTree();
        }

        self._afterRenderTreeFn();
      });
    } else {
      $.when(this._ajaxGetNodes()).then(function() {
        self._renderTree();

        if (self.scrollSettings.enable) {
          self._scrollGetNodes();
        }

        self._afterRenderTreeFn();
      });
    }
  };

  // 异步获取机构数据的方法（每次请求获取一页数据）
  AsyncOfficeTree.prototype._ajaxGetNodes = function() {
    if (this.isLoading) {
      return;
    }

    var dfd = new $.Deferred(),
      self = this,
      _ajaxParams = {
        data: {}
      },
      _dynamicData = this.ajaxParams.dynamicData && Object.keys(this.ajaxParams.dynamicData);

    if (this.ajaxSuccessKey.pageSize && !this.ajaxParams.data[this.ajaxSuccessKey.pageSize]) {
      _ajaxParams.data[this.ajaxSuccessKey.pageSize] = this.pageSize;
    }

    if (this.ajaxSuccessKey.pageNo) {
      _ajaxParams.data[this.ajaxSuccessKey.pageNo] = ++this.pageNo;
    }

    if (_dynamicData.length) {
      $.each(_dynamicData, function(index, item) {
        _ajaxParams.data[item] = typeof(self.ajaxParams.dynamicData[item]) === 'function' &&
          self.ajaxParams.dynamicData[item]();
      });
    }

    _ajaxParams = $.extend(true, this.ajaxParams, _ajaxParams);
    this.isLoading = true;

    $.ajax(_ajaxParams).done(function(res) {
      var _newZNodes = res &&
        (self.ajaxSuccessKey.flagKey &&
          res[self.ajaxSuccessKey.flagKey] == self.ajaxSuccessKey.flagVal &&
          res[self.ajaxSuccessKey.dataKey] ||
          res) ||
        null,
        _len = _newZNodes && _newZNodes.length || 0;

      if (_len) {
        _newZNodes = _len > self.pageSize ? _newZNodes.slice((self.pageNo - 1) * self.pageSize, self.pageNo * self.pageSize) :
          _newZNodes.slice(0, self.pageSize);

        if (self.refactorZNodesFn && typeof(self.refactorZNodesFn) === 'function') {
          _newZNodes = self.refactorZNodesFn(_newZNodes);
        }

        if (self.ajaxSuccessKey.pageSize && res[self.ajaxSuccessKey.pageSize]) {
          self.pageSize = res[self.ajaxSuccessKey.pageSize];
        }

        if (self.ajaxSuccessKey.pageNo && res[self.ajaxSuccessKey.pageNo]) {
          self.pageNo = res[self.ajaxSuccessKey.pageNo];
        }

        if (!self.officeTotal && self.ajaxSuccessKey.officeTotal && res[self.ajaxSuccessKey.officeTotal]) {
          self.officeTotal = res[self.ajaxSuccessKey.officeTotal];
        }

        if (!self.isAllLoad) {
          self.pageZNodes = _newZNodes;
        }

        self.zNodes = self.zNodes.concat(_newZNodes);
        dfd.resolve(1);
      } else {
        if (self.isNotCountTotal) {
          self.isAjaxAllEnd = true;
        }

        dfd.resolve(0);
      }
    }).fail(function(jqXHR, textStatus) {
      console.log(textStatus);
      dfd.resolve(-1);
    }).always(function() {
      self.isLoading = false;
    });

    return dfd.promise();
  };

  // 异步获取全部机构数据的方法
  AsyncOfficeTree.prototype._ajaxGetAllNodes = function() {
    var dfd = new $.Deferred(),
      self = this;

    if (this.pageSize * this.pageNo < this.officeTotal || (this.isNotCountTotal && !this.isAjaxAllEnd)) {
      $.when(this._ajaxGetNodes()).then(function(res) {
        if (res !== -1) {
          $.when(self._ajaxGetAllNodes()).then(function() {
            dfd.resolve();
          });
        } else {
          console.log('在获取第' + self.pageNo + '页机构数据时出错中断全部加载请求！');
          dfd.resolve();
        }
      });
    } else {
      console.log('全部机构数据获取完毕！');
      dfd.resolve();
    }

    return dfd.promise();
  };

  // 滚动获取一页数据的方法
  AsyncOfficeTree.prototype._scrollGetNodes = function() {
    var self = this;

    $(this.domWrapSelector).scroll(function() {
      var viewH = $(self.domWrapSelector).height(); //可见高度
      var contentH = $(self.domWrapSelector).get(0).scrollHeight; //内容高度
      var scrollTop = $(self.domWrapSelector).scrollTop(); //滚动高度
      var relative = scrollTop / (contentH - viewH) || 0; //相对位置
      var limit = self.scrollSettings.bottomLimit; //最大滚动位置

      if (relative >= limit && !self.isLoading) {
        if (self.pageSize * self.pageNo < self.officeTotal || (self.isNotCountTotal && !self.isAjaxAllEnd)) {
          self._beforeRenderTreeFn();
          $.when(self._ajaxGetNodes()).then(function(res) {
            if (res === 1) {
              self._renderTree();
            }

            $(self.domWrapSelector).getNiceScroll(0).doScrollTop(contentH - viewH);
            self._afterRenderTreeFn();
          });
        } else {
          console.log('滚动加载到底了...');
        }
      }
    });
  };

  // 收起树节点执行函数
  AsyncOfficeTree.prototype._onCollapse = function(event, treeId, treeNode) {
    // var self = this, args = arguments;

    // if (!this.isAllLoad && treeNode && treeNode.tId !== 'tree_1' && !this.isLoading) {
    //   var visibleLen = $(this.domSelector).find('li:visible').length;

    //   if (1 < visibleLen && visibleLen < this.pageSize &&
    //     (this.pageSize * this.pageNo < this.officeTotal || (this.isNotCountTotal && !this.isAjaxAllEnd))) {
    //     $.when(this._ajaxGetNodes()).then(function(res) {
    //       if (res === 1) {
    //         self._renderTree();
    //       }

    //       self._afterRenderTreeFn();
    //       self._onCollapse.apply(self, Array.prototype.slice.call(args));
    // 	args = null;
    //     });
    //   } else {
    //     console.log('加载到底了...');
    //     this.customOnCollapse && typeof(this.customOnCollapse) === 'function' && this.customOnCollapse();
    //     $(this.domWrapSelector).getNiceScroll().resize();
    //   }
    // } else {
    this.customOnCollapse && typeof(this.customOnCollapse) === 'function' && this.customOnCollapse();
    $(this.domWrapSelector).getNiceScroll().resize();
    // }
  };

  // 展开树节点执行函数
  AsyncOfficeTree.prototype._onExpand = function(event, treeId, treeNode) {
    this.customOnExpand && typeof(this.customOnExpand) === 'function' && this.customOnExpand();
    $(this.domWrapSelector).getNiceScroll().resize();
  };

  // 绘制机构树前的方法
  AsyncOfficeTree.prototype._beforeRenderTreeFn = function() {
    this.beforeRenderTreeFn && this.beforeRenderTreeFn(this);
    $(this.domWrapSelector).css('position', 'relative').append(
      '<div id="zfy" style="width: 100%;height: 100%;position: ' + this.scrollSettings.zfyBoxPosition + ';' +
      'left: 0;top: 0;z-index: 999;background-color: rgba(255,255,255,0.5);display: flex;align-items: center;justify-content: center;">' +
      '<img alt="loading..." title="loading..." src="' + this.loadingIconUrl + '" width="150px" height="auto" />' +
      '</div>');
  };

  // 绘制机构树的方法
  AsyncOfficeTree.prototype._renderTree = function() {
    if (this.pageNo == 1) {
      $(this.domSelector).empty();
      this.zTreeObj = $.fn.zTree.init($(this.domSelector), this.zTreeSetting, this.zNodes);
    } else if (!this.isAllLoad && this.scrollSettings.enable && this.pageZNodes.length > 0) {
      var _pageZNodesMap = {},
        self = this;

      $.each(this.pageZNodes, function(index, item) {
        if (_pageZNodesMap.hasOwnProperty(item.pId)) {
          _pageZNodesMap[item.pId].push(item);
        } else {
          _pageZNodesMap[item.pId] = [];
        }
      });
      $.each(Object.keys(_pageZNodesMap), function(index, item) {
        var node = self.zTreeObj.getNodeByParam('id', item, null);
        self.zTreeObj.addNodes(node, _pageZNodesMap[item]);
      });
    }
  };

  // 绘制机构树后的方法
  AsyncOfficeTree.prototype._afterRenderTreeFn = function() {
    this.afterRenderTreeFn && this.afterRenderTreeFn(this);
    $(this.domWrapSelector).getNiceScroll().resize();
    $('#zfy').remove();

    if (this.isAllLoad) {
      $(this.domWrapSelector).getNiceScroll(0).doScrollTop(0, 1);
      this._clear();
    }
  };

  // 获取生成树的数据的方法（公开）
  AsyncOfficeTree.prototype.getZNodes = function() {
    return this.zNodes || [];
  };

  // 获取初始化后缓存zTree对象的方法（公开）
  AsyncOfficeTree.prototype.getZTreeObj = function() {
    return this.zTreeObj || $.fn.zTree.init($(this.domSelector), this.zTreeSetting, this.zNodes || []);
  };

  // 置空成员变量的方法
  AsyncOfficeTree.prototype._clear = function() {
    this.zNodes = null;
    this.zTreeObj = null;
  };

  window.AsyncOfficeTree = window.AsyncOfficeTree || AsyncOfficeTree;

})(window, jQuery);
