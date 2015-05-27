# ajaxProxy
ajaxProxy is an ajax request sending proxy, which supports chain order request and blocking request
ajaxProxy是一个异步请求的代码发送器，提供一种可读性更好的接口来实现异步请求的流程控制，并且提供了阻塞式请求，在执行这类请求前会将页面上其他并发请求中止掉。

阻塞式请求
ajaxProxy提供了blockReq函数实现对已丢弃请求的阻塞，且支持多条队列，只有同一队列中的请求才会互相阻塞，所以我们可以在页面的不同区域使用不同的队列，不同区域的请求互不干扰，统一区域的请求互相阻塞。

blockReq调用方式：
引入ajaxProxy文件，

    ajaxProxy.blockReq({
     url: "",
     data: {},
     success: function(data){
      }
	}, sQueueName)

如果多个请求指定了同一个sQueueName，那么后发起的请求会阻塞前面的请求。

链式请求
ajaxProxy实现了类似then.js的异步请求的流程控制。

调用方式：

引入ajaxProxy文件，

	ajaxProxy.req({
	     url: "",
	     data: {},
	     success: function(data){
	      }
	}).req({
	     url: "",
	     data: {},
	     success: function(data){
	      }
	}).req({
	     url: "",
	     data: {},
	     success: function(data){
	      }
	}).invoke();
