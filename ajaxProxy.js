/**
 * ajaxProxy is an ajax request sending proxy, which supports chain order request and blocking request
 * req(config): Can be called continuous, the ajax with config will be executed in order, which avoids complex nested callbacks
 * blockReq(config, sQueueName): Will push the ajax with config in a queue with the sQueueName, before the ajax is executed, all other requests in same queue will be aborted
 *
 * Please refer to: http://www.charlestech.org
 * Created by Charles on 15-5-26.
 */

;
(function () {
    var _bDebug = true; // Debug flag
    // Print debug message in console
    var _debug = function (sMessage, bError) {
        if (!_bDebug) return;
        if (bError) {
            console.error(sMessage);
            return;
        }
        console.log(sMessage);
    }

    /**
     * Ajax request scheduler, support chain request
     * @private
     */
    function _AjaxScheduler() {
        this.aReqChain = [];
        this.nChainIndex = 0;
    }

    /**
     * Push the request config into the request chain in order
     * @param config
     */
    _AjaxScheduler.prototype.req = function (config) {
        var thisObj = this;
        config.bReqFlag = 0;    // 0 means the request has not been executed

        // As long as the ajax completes, set the flag as 1 and schedule to the next one
        config.complete = function () {
            config.bReqFlag = 1;
            thisObj.nChainIndex++;
            thisObj.schedule();
        }

        // Push into the chain
        this.aReqChain.push(config);
        return thisObj;
    }

    /**
     * Schedule the next request
     */
    _AjaxScheduler.prototype.schedule = function () {
        if (this.nChainIndex < 0 || this.nChainIndex >= this.aReqChain.length) {
            _debug("[schedule] The ajax chain is end");
        }

        var oCur = this.aReqChain[this.nChainIndex];
        if (oCur && oCur.bReqFlag == 0) {
            this.sendRequest(oCur);
        }
    }

    /**
     * Invoke the request chain, send ajax for the first member in the chain
     */
    _AjaxScheduler.prototype.invoke = function () {
        _debug("[invoke] The ajax chain is invoked, chain length: " + this.aReqChain.length);
        if (this.aReqChain.length > 0)
            this.sendRequest(this.aReqChain[0]);
    }

    /**
     * Send ajax request
     */
    _AjaxScheduler.prototype.sendRequest = function (config) {
        if (!config.url) return;
        $.ajax(config);
    }


    /**
     * Sending blocking request, if the queue in the queue pool has unfinished requests, abort them
     * @private
     */
    function _BlockingAjax() {
        // The queue pool, managing multiple queues, only the requests in one queue would block each others
        this.aQueuePool = {
            "default": []   // If queue name is not specified, will push into default queue
        }
    }

    /**
     * Send blocking ajax request, abort all requests in same queue before sending
     * @param config
     * @param sQueue
     */
    _BlockingAjax.prototype.blockingAjax = function (config, sQueue) {
        var thisObj = this;
        if (!config.url) {
            _debug("[blockingAjax] Url is not specified", true);
            return;
        }
        if (!sQueue || sQueue === "") sQueue = "default";
        // Before the request is sent, push request into the specified queue
        config.beforeSend = function (xhr) {
            thisObj.fEnque(xhr, sQueue);
        }
        // Once the request is completed, deque from the specified queue
        config.complete = function (xhr) {
            thisObj.fDeque(xhr, sQueue);
        }
        thisObj.abortReqInQueue(sQueue);
        $.ajax(config);
    }

    /**
     * Push request into the specified queue
     * @param xhr
     * @param sQueue
     */
    _BlockingAjax.prototype.fEnque = function (xhr, sQueue) {
        if (!this.aQueuePool[sQueue]) {
            this.aQueuePool[sQueue] = [];
        }
        this.aQueuePool[sQueue].push(xhr);
        _debug("[fEnque] Request " + xhr + " has been pushed into queue: " + sQueue + ", current queue length: " + this.aQueuePool[sQueue].length);
    }

    /**
     * Deque from the specified queue
     */
    _BlockingAjax.prototype.fDeque = function (xhr, sQueue) {
        if (!this.aQueuePool[sQueue]) {
            _debug("[fDeque] Queue '" + sQueue + "' does not exists", true);
            return;
        }

        for (var i = 0; i < this.aQueuePool[sQueue].length; i++) {
            if (this.aQueuePool[sQueue][i] == xhr) {
                this.aQueuePool[sQueue].splice(i, 1);
                _debug("[fDeque] The request " + xhr + " has been removed from queue: " + sQueue);
                break;
            }
        }
    }

    /**
     * Abort all request in the specified queue
     */
    _BlockingAjax.prototype.abortReqInQueue = function (sQueue) {
        if (!this.aQueuePool[sQueue]) {
            _debug("[abortReqInQueue] Queue '" + sQueue + "' does not exists");
            return;
        }
        _debug("[abortReqInQueue] Abort all requests in queue: " + sQueue + ", current length: " + this.aQueuePool[sQueue].length);
        do {
            // First in first out
            var xhr = this.aQueuePool[sQueue].shift();
            if (xhr) xhr.abort();
        }
        while (this.aQueuePool[sQueue].length > 0);
    }


    // Define ajaxProxy object
    if (typeof(ajaxProxy) == "undefined" || !ajaxProxy.description) {
        ajaxProxy = {
            description: "Ajax request handler, supports blocking ajax and chain request",
            blockingAjax: new _BlockingAjax(),
            req: function (config) {
                var scheduler = new _AjaxScheduler();
                return scheduler.req(config);
            },
            blockReq: function (config, sQueueName) {
                this.blockingAjax.blockingAjax(config, sQueueName);
            }
        }
    }
})();