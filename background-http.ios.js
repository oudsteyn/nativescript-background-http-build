var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var observable_1 = require("data/observable");
var BackgroundUploadDelegate = (function (_super) {
    __extends(BackgroundUploadDelegate, _super);
    function BackgroundUploadDelegate() {
        _super.apply(this, arguments);
    }
    BackgroundUploadDelegate.prototype.URLSessionDidBecomeInvalidWithError = function (session, error) {
    };
    BackgroundUploadDelegate.prototype.URLSessionDidReceiveChallengeCompletionHandler = function (session, challenge, comlpetionHandler) {
        var disposition = null;
        var credential = null;
        comlpetionHandler(disposition, credential);
    };
    BackgroundUploadDelegate.prototype.URLSessionDidFinishEventsForBackgroundURLSession = function (session) {
    };
    BackgroundUploadDelegate.prototype.URLSessionTaskDidCompleteWithError = function (session, nsTask, error) {
        var task = Task.getTask(session, nsTask);
        if (error) {
            task.notifyPropertyChange("status", task.status);
            task.notify({ eventName: "error", object: task, error: error });
        }
        else {
            task.notifyPropertyChange("upload", task.upload);
            task.notifyPropertyChange("totalUpload", task.totalUpload);
            task.notify({ eventName: "progress", object: task, currentBytes: nsTask.countOfBytesSent, totalBytes: nsTask.countOfBytesExpectedToSend });
            task.notify({ eventName: "complete", object: task });
            Task._tasks.delete(nsTask);
        }
    };
    BackgroundUploadDelegate.prototype.URLSessionTaskDidReceiveChallengeCompletionHandler = function (session, task, challenge, completionHandler) {
        var disposition = null;
        var credential = null;
        completionHandler(disposition, credential);
    };
    BackgroundUploadDelegate.prototype.URLSessionTaskDidSendBodyDataTotalBytesSentTotalBytesExpectedToSend = function (nsSession, nsTask, data, sent, expectedTotal) {
        var task = Task.getTask(nsSession, nsTask);
        task.notifyPropertyChange("upload", task.upload);
        task.notifyPropertyChange("totalUpload", task.totalUpload);
        task.notify({ eventName: "progress", object: task, currentBytes: sent, totalBytes: expectedTotal });
    };
    BackgroundUploadDelegate.prototype.URLSessionTaskNeedNewBodyStream = function (session, task, need) {
    };
    BackgroundUploadDelegate.prototype.URLSessionTaskWillPerformHTTPRedirectionNewRequestCompletionHandler = function (session, task, redirect, request, completionHandler) {
        completionHandler(request);
    };
    BackgroundUploadDelegate.prototype.URLSessionDataTaskDidReceiveResponseCompletionHandler = function (session, dataTask, response, completionHandler) {
        var disposition = null;
        completionHandler(disposition);
    };
    BackgroundUploadDelegate.prototype.URLSessionDataTaskDidBecomeDownloadTask = function (session, dataTask, downloadTask) {
    };
    BackgroundUploadDelegate.prototype.URLSessionDataTaskDidReceiveData = function (session, dataTask, data) {
        var jsTask = Task.getTask(session, dataTask);
        var jsonString = NSString.alloc().initWithDataEncoding(data, NSUTF8StringEncoding);
        jsTask.notify({ eventName: "responded", object: jsTask, data: jsonString.toString() });
    };
    BackgroundUploadDelegate.prototype.URLSessionDataTaskWillCacheResponseCompletionHandler = function () {
    };
    BackgroundUploadDelegate.prototype.URLSessionDownloadTaskDidResumeAtOffsetExpectedTotalBytes = function (session, task, offset, expects) {
    };
    BackgroundUploadDelegate.prototype.URLSessionDownloadTaskDidWriteDataTotalBytesWrittenTotalBytesExpectedToWrite = function (session, task, data, written, expected) {
    };
    BackgroundUploadDelegate.prototype.URLSessionDownloadTaskDidFinishDownloadingToURL = function (session, task, url) {
    };
    BackgroundUploadDelegate.ObjCProtocols = [NSURLSessionDelegate, NSURLSessionTaskDelegate, NSURLSessionDataDelegate, NSURLSessionDownloadDelegate];
    return BackgroundUploadDelegate;
}(NSObject));
var Session = (function () {
    function Session(id) {
        var delegate = BackgroundUploadDelegate.alloc().init();
        var configuration = NSURLSessionConfiguration.backgroundSessionConfigurationWithIdentifier(id);
        this._session = NSURLSession.sessionWithConfigurationDelegateDelegateQueue(configuration, delegate, null);
    }
    Object.defineProperty(Session.prototype, "ios", {
        get: function () {
            return this._session;
        },
        enumerable: true,
        configurable: true
    });
    Session.prototype.uploadFile = function (file, options) {
        if (!file) {
            throw new Error("File must be provided.");
        }
        var url = NSURL.URLWithString(options.url);
        var request = NSMutableURLRequest.requestWithURL(url);
        var headers = options.headers;
        if (headers) {
            for (var header in headers) {
                var value = headers[header];
                if (value !== null && value !== void 0) {
                    request.setValueForHTTPHeaderField(value.toString(), header);
                }
            }
        }
        if (options.method) {
            request.HTTPMethod = options.method;
        }
        var fileURL;
        if (file.substr(0, 7) === "file://") {
            fileURL = NSURL.URLWithString(file);
        }
        else if (file.charAt(0) === "/") {
            fileURL = NSURL.fileURLWithPath(file);
        }
        var newTask = this._session.uploadTaskWithRequestFromFile(request, fileURL);
        newTask.taskDescription = options.description;
        newTask.resume();
        return Task.getTask(this._session, newTask);
    };
    Session.getSession = function (id) {
        var jsSession = Session._sessions[id];
        if (jsSession) {
            return jsSession;
        }
        jsSession = new Session(id);
        Session._sessions[id] = jsSession;
        return jsSession;
    };
    Session._sessions = {};
    return Session;
}());
var Task = (function (_super) {
    __extends(Task, _super);
    function Task(nsSession, nsTask) {
        _super.call(this);
        this._task = nsTask;
        this._session = nsSession;
    }
    Object.defineProperty(Task.prototype, "ios", {
        get: function () {
            return this._task;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Task.prototype, "description", {
        get: function () {
            return this._task.taskDescription;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Task.prototype, "upload", {
        get: function () {
            return this._task.countOfBytesSent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Task.prototype, "totalUpload", {
        get: function () {
            return this._task.countOfBytesExpectedToSend;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Task.prototype, "status", {
        get: function () {
            if (this._task.error) {
                return "error";
            }
            switch (this._task.state) {
                case 0: return "uploading";
                case 3: return "complete";
                case 2: return "error";
                case 1: return "pending";
            }
        },
        enumerable: true,
        configurable: true
    });
    Task.getTask = function (nsSession, nsTask) {
        var task = Task._tasks.get(nsTask);
        if (task) {
            return task;
        }
        task = new Task(nsSession, nsTask);
        Task._tasks.set(nsTask, task);
        return task;
    };
    Task._tasks = new Map();
    return Task;
}(observable_1.Observable));
function session(id) {
    return Session.getSession(id);
}
exports.session = session;
