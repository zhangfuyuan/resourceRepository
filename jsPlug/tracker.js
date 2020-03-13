/**
 * 埋点插件，依赖jQuery
 * */

(function(window, document, $) {

  // 构造函数
  function ApmTracker(arg) {
    if (!$) {
      throw new Error('使用本插件前必须引入 jQuery！');
      return;
    }

    // 发送埋点数据的路径
    this.sendSrc = arg.sendSrc || '/apm-web/static/images';
    // 埋点项（可选：uri）
    this.trackOptions = $.extend(true, {
      ajax: {
        enable: false, // false不启动，true启用跟踪请求接口
        validAjax: 'all', // 'all'代表跟踪所有请求；若过滤有效请求则传入对象，格式为{'/uri1':'tag1','/uri2':'tag2'}（key为uri，value为自定义信息，请确保uri的唯一性且不带域和参数）
        paramsFormat: 'serverIp={o}&uri={u}&tag={t}' // 发送数据的参数格式，{o}代表请求域，{u}代表请求uri，{t}代表自定义信息
      },
      event: {
        enable: false, // false不启动，true启用跟踪事件触发（暂不支持）
        on: null // 监听事件名及触发元素关联图（暂不支持）
      }
    }, arg.trackOptions || {});

    // 埋点累计数据图（暂不用）
    // this.state = {};
    // 调用初始化方法
    this._init();
    console.log('%cTracking page', 'padding: 5px;background-color: #42C02E;color: #ffffff;border-radius: 5px;');
  }

  // 初始化的方法（每个实例对象仅调用一次）
  ApmTracker.prototype._init = function() {
    if (this.trackOptions.ajax.enable === true) {
      this._trackAjax();
    }

    if (this.trackOptions.event.enable === true) {
      this._trackEvent();
    }
  };

  // 跟踪请求
  ApmTracker.prototype._trackAjax = function() {
    var _uriList = Array.isArray(this.trackOptions.uri) && this.trackOptions.uri || [];

    $(document).ajaxComplete(function(event, xhr, settings) {
      try {
        var origin = window.location.origin;
        var uri = settings.url.split('?')[0].replace(origin, '');console.log('%c'+uri, 'color: red;');
        var ajaxOption = this.trackOptions.ajax || {};
        var paramsObj = {
          o: origin,
          u: uri,
          t: ''
        };
        var params = '';

        if (ajaxOption.validAjax === 'all') {
          params = ajaxOption.paramsFormat.replace(/{(o|u|t)}/g, function(match, key) {
            return encodeURIComponent(paramsObj[key]);
          });
          this._send(params);
        } else if (ApmTracker.utils.isObj(ajaxOption.validAjax) && typeof(ajaxOption.validAjax[uri]) ===
          'string') {
          paramsObj.t = ajaxOption.validAjax[uri];
          params = ajaxOption.paramsFormat.replace(/{(o|u|t)}/g, function(match, key) {
            return encodeURIComponent(paramsObj[key]);
          });
          this._send(params);
        }
      } catch (err) {
        console.log(err);
      }
    }.bind(this));
  };

  // 跟踪事件
  ApmTracker.prototype._trackEvent = function() {};

  // 发送数据
  ApmTracker.prototype._send = function(params) {
    var img = new Image();
    img.onload = img.onerror = img.onabort = function() {
      img.onload = img.onerror = img.onabort = null;
      img = null;
    };
    img.src = this.sendSrc + '?' + params;
  };

  // 工具类
  ApmTracker.utils = {
    // 兼容数组的contains方法
    contains: function(array, needle) {
      if (!Array.isArray(array)) return -1;

      if (Array.prototype.contains) {
        return array.contains(needle);
      } else {
        for (var i in array) {
          if (array[i].indexOf && array[i].indexOf(needle) > -1) return i;
        }
        var index = array.indexOf(needle);
        if (index > -1) return index;
        return -1;
      }
    },

    // 置url参数 setUrlParam({a:1,b:2}) -> a=1&b=2
    setUrlParam: function(obj) {
      var query = [];

      for (var i in obj) {
        if (obj[i] != null && obj[i] !== '') {
          query.push(i + '=' + obj[i]);
        }
      }

      return query.join('&');
    },

    // 判断是否为对象
    isObj: function(val) {
      return Object.prototype.toString.call(val) === '[object Object]';
    }
  };

  window.ApmTracker = window.ApmTracker || ApmTracker;

})(window, document, window.jQuery);

// 调用
var apmTracker = new ApmTracker({
  sendSrc: 'http://192.168.1.28:8081/common/getTerminalId',
  trackOptions: {
    ajax: {
      enable: true,
      validAjax: {
        "/apm-web/a/login": "登录_用户登录",
        "/apm-web/a/sys/user/register": "登录_用户注册",
        "/apm-web/a/sys/user/modifyPassword": "登录_找回密码",
        "/apm-web/a/logout": "登出_安全退出",
        "/apm-web/static/images/homePage/guide_terminalAccess_zh.html": "首页_使用帮助",
        "/apm-web/static/images/homePage/guide_releaseProgram_zh.html": "首页_使用帮助",
        "/apm-web/a/fileInfosa/uploaderMD5Check": "素材管理_上传素材",
        "/apm-web/a/resManage/copyOrCut": "素材管理_粘贴素材",
        "/apm-web/a/resManage/rename": "素材管理_重命名素材",
        "/apm-web/a/resManage/delete": "素材管理_删除素材",
        "/apm-web/a/materialAudit/shareAuditList": "素材管理_分享素材",
        "/apm-web/a/materialAudit/quitShare": "素材管理_取消分享素材",
        "/apm-web/a/resManage/updateFile": "素材管理_拖动素材",
        "/apm-web/a/resManage/myRes": "素材管理_切换至共享素材",
        "/apm-web/a/folder/addFolder": "素材管理_新建文件夹",
        "/apm-web/a/folder/copyOrCut": "素材管理_粘贴文件夹",
        "/apm-web/a/folder/renameFolder": "素材管理_重命名文件夹",
        "/apm-web/a/folder/delete": "素材管理_删除文件夹",
        "/apm-web/a/program/checkAllDelAllProgramModel": "模板素材_（批量）删除",
        "/apm-web/a/program/removeModel": "模板素材_（批量）删除",
        "/apm-web/a/program/shareProgramModel": "模板素材_分享",
        "/apm-web/a/program/unShareProgramModel": "模板素材_取消分享",
        "/apm-web/a/fileInfosa/askProgramTempletIsImportFinish": "模板素材_导入模板",
        "/apm-web/a/program/createExportMoreProgramTemplet": "模板素材_批量导出模板",
        "/apm-web/a/program/createExportProgramTemplet": "模板素材_导出单个模板",
        "/apm-web/a/program/getEditHtml": "公用_预览",
        "/apm-web/a/program/ajaxSaveModel": "节目制作_保存模板",
        "/apm-web/a/publishProgram/ajaxSave": "节目制作_保存/另存为",
        "/apm-web/a/publishProgram/savePublishSet": "发布设置_保存/下一步（选择终端）",
        "/apm-web/a/publishProgram/saveTerminals": "选择终端_保存/提交",
        "/apm-web/a/publishProgram/checkPubPro": "选择终端_审核",
        "ajaxConfirmBatchDelete": "通用列表_同步删除",
        "ajaxDelete": "通用列表_仅删除记录",
        "ajaxConfirmDelete": "节目管理_同步删除",
        "/apm-web/a/publishProgram/groupsterminals": "节目管理_查看详情",
        "/apm-web/a/publishProgram/createExportProgram": "节目管理_导出节目包",
        "/apm-web/a/publishProgram/cancelUploadProgram": "节目管理_取消发布",
        "/apm-web/a/publishProgram/reuploadProgram": "节目管理_重新发布（重传）",
        "/apm-web/a//playPlan/createExportPlayPlan": "播放计划_导出计划包",
        "/apm-web/a/playPlan/cancelUploadPlayPlan": "播放计划_取消发布",
        "/apm-web/a/playPlan/reuploadPlayPlan": "播放计划_重新发布（重传）",
        "/apm-web/a/playPlan/savePlayPlan": "播放计划_保存/下一步（选择终端）",
        "/apm-web/a/playPlan/saveTerminals": "播放计划_保存/提交",
        "/apm-web/a/playPlan/checkPlayPlan": "播放计划_审核",
        "/apm-web/a/publishMessage/ajaxSave": "消息制作_保存",
        "/apm-web/a/publishMessage/savePublish": "消息制作_保存/提交",
        "/apm-web/a/terminalMonitor/screenShoot": "终端监控_实时数据/刷新截图",
        "/apm-web/a/terminalMonitor/reboot": "终端监控_重启",
        "/apm-web/a/terminalMonitor/standby": "终端监控_待机",
        "/apm-web/a/terminalMonitor/shutdown": "终端监控_关机",
        "/apm-web/a/terminalMonitor/standbyAwaken": "终端监控_唤醒",
        "/apm-web/a/terminalMonitor/format": "终端监控_清空节目",
        "/apm-web/a/terminalMonitor/deleteFile": "终端监控_删除节目",
        "/apm-web/a/fileInfosa/findBytreeIdAndType": "终端监控_历史截图",
        "/apm-web/a/terminalMonitor/getCurTerminalProgram": "终端信息_查看节目",
        "/apm-web/a/terminalMonitor/getCurTerminalMessage": "终端信息_查看消息",
        "/apm-web/a/terminal/updateTeOffice": "终端信息_移动分组	",
        "/apm-web/a/terminal/removeTerminals": "终端信息_（批量）删除",
        "/apm-web/a/terminal/submitTeInfo": "终端信息_修改",
        "/apm-web/a/terminalMonitor/deleteFileByTerminalIds": "终端信息_删除节目",
        "/apm-web/a/terminalMonitor/deleteTerminalMessageByTerminalIds": "终端信息_删除消息",
        "/apm-web/a/terminalMonitor/getCurTerminalInfo": "终端信息_查看播放状态",
        "/apm-web/a/sys/log/detailsFunc": "终端设置_查看设置日志",
        "/apm-web/a/terminalSettings/onTimer": "终端设置_定时开关机",
        "/apm-web/a/terminalSettings/doReboot": "终端设置_电源控制",
        "/apm-web/a/terminalSettings/volumeSetting": "终端设置_音量设置",
        "/apm-web/a/terminalSettings/timingPorts": "终端设置_端口设置",
        "/apm-web/a/terminalSettings/timeShootSetting": "终端设置_截屏设置",
        "/apm-web/a/terminalSettings/sendDedicatedApk": "终端设置_在线升级",
        "/apm-web/a/terminalSettings/doFormat": "终端设置_清空节目",
        "/apm-web/a/terminalSettings/doSetTerminalDisable": "终端设置_禁用",
        "/apm-web/a/terminalSettings/doSetTerminalEnable": "终端设置_（禁用后）恢复",
        "/apm-web/a/sys/user/delete": "用户管理_批量删除",
        "/apm-web/a/sys/user/save": "用户管理_修改",
        "/apm-web/a/terminal/searchOffice": "机构管理_搜索",
        "/apm-web/a/terminalQuantityControl/updateTerminalHQTotalNumber": "机构管理_（刷新）认证",
        "/apm-web/a/terminalQuantityControl/cancelTerminalHQTotalNumber": "机构管理_反认证",
        "/apm-web/a/sys/office/personalAuthentication": "机构管理_刷新客制化认证",
        "/apm-web/a/sys/office/equipmentCode": "机构管理_获取设备码",
        "/apm-web/a/sys/office/licenseNeed": "机构管理_离线认证",
        "/apm-web/a/terminal/deleteOffice": "机构管理_删除",
        "/apm-web/a/sys/office/moveinstitude": "机构管理_移动",
        "/apm-web/a/sys/sysSetting/saveVolSetting": "系统设置_容量分配",
        "/apm-web/a/sys/sysSetting/save": "系统设置_保存设置/恢复默认设置",
        "/apm-web/a/widget/updateWidgetState": "控件管理_隐藏/显示",
        "/apm-web/a/widget/delete": "控件管理_删除",
        "/apm-web/a/widget/updateSystemWidget": "控件管理_编辑",
        "/apm-web/a/widget/save": "控件管理_添加",
        "/apm-web/a/playStatistics/statisticsPlay": "数据统计_播放统计",
        "/apm-web/f/common/getShareTerminalMapUrl": "终端地图_页面分享",
        "/apm-web/f/common/updateShareTerminalMap": "终端地图_切换分享状态",
        "/apm-web/a/sys/user/saveinfo": "基础信息_保存设置"
      }
    }
  }
});
