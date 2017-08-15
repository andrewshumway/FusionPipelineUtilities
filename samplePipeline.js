// declare known globals and tell jshint to allow these globals so that an IDE can validate.
/* globals  Java, logger, ctx,   params,arguments*/
// See more examples at https://doc.lucidworks.com/fusion/3.0/Indexing_Data/Custom-JavaScript-Indexing-Stages.html

(function() {
  "use strict";

  //Change MODE to the type of pipeline you are using
  var MODE="INDEX"; //This is the default
  //var MODE="QUERY";

  var loadStatusContext= {};
  /**
   * This is broken out in case there is more than one library script to load e.g. utils and a customer specific one
   */
  var loadLibrary = function(url){
    var lib = null;
    var prefix =  url.substr(url.lastIndexOf('/') + 1);
    try{
      logger.info('\n\n**************\n*Try to library load from: ' + url + '\n******************\n');
      lib = load(url);// jshint ignore:line
      loadStatusContext[prefix + '_lib'] = "loaded";
      logger.info('\n\n**************\n* The library loaded from: ' + url + '\n******************\n');
    }catch(e){
      loadStatusContext[prefix + '_loadError'] = e;
      logger.error('\n\n**************\n* The utility library at ' + url + ' is missing or invalid\n');
      if(e && e.message) {
        logger.error('Message:' + e.message + '\n******************\n');
      }
    }
    return lib;
  };
  /*****
   *  The scope init function is used to get the util library loaded when the script is evaluated/compiled.
   *  This lets Fusion cache and reuse the script after library load and avoids a reload of the library
   *  with each invocation.
   *
   * IMPORTANT NOTE ABOUT CACHING AND RELOAD
   * Because pipeline stages evaluated/compile and then cached ( for performance )the loaded JavaScript library will not be read in
   * unless the pipeline script is re evaluated/compiled and then cached.  This happens (in 3.0) in the following scenarios (at least)
   * 1. Fusion service restart
   * 2. Pipeline saved
   * 3. Workbench test applied or saved
   *
   * Simply clearing a datasource, changing a datasource run does not trigger a reload of the cached script.
   */

  /**
   * Load the utility library and hold it in a variable visible by _this
   */
  var util = function loadUtilLibrary(){
    //logger.info('\n\n**************\n* The Utility loader\n******************\n');
    var url = java.lang.System.getProperty('apollo.home') + '/scripts/utilLib.js';
    loadStatusContext.property = url;
   return loadLibrary(url);
  }();//auto invoke this when the script loads to bootstrap util


  var _this = {};

  /**
   * see https://doc.lucidworks.com/fusion/3.0/Search/Custom-JavaScript-Query-Stages.html for bad documentation
   * They claim that params and ctx/_context are passed but only ctx is actually passed
   *
   * @param request The Solr query information.
   * @param response The Solr response information.
   * @param params A reference to the container which holds a map over the pipeline properties. Used to update or modify this information for downstream pipeline stages.
   * @param ctx A reference to the container which holds a map over the pipeline properties. Used to update or modify this information for downstream pipeline stages.
   * @param _context Another reference to the same object as ctx, included because some stages use this name instead.
   * @param collection the name of the Fusion collection being queried
   * @param solrServer  The Solr server instance that manages the pipeline’s default Fusion collection. All indexing and query requests are done by calls to methods on this object. See SolrClient for details.
   * @param solrServerFactory The SolrCluster server used for lookups by collection name which returns a Solr server instance for a that collection, e.g.
   * @returns {*}
   */
  //_this.doPipelineQuery = function(request, response, params, ctx, _context, collection, solrServer, solrServerFactory) {
    _this.doPipelineQuery = function(request, response, ctx, collection, solrServer, solrServerFactory) {
      logger.debug('\n\n************JS pipeline script invoked.');
      ctx.put("loadStatus",loadStatusContext);

      //TODO:  add pipeline code here and delete the runTests() call as needed.
    if (util && util.query) {
      util.query.runTests(request, response, ctx, collection, solrServer, solrServerFactory);
    }

    /*
    JavascriptQueryStage uses the QueryRequestAndResponse wrapper to pass the request and response params
    Mutate request and response as needed and then return a non-null object to signal that the original
    wrapper be used.  If you need to return a new request or response then return a
     new com.lucidworks.apollo.pipeline.query.QueryRequestAndResponse(myNewRequest,myNewResponse);
      */
    return new com.lucidworks.apollo.pipeline.query.QueryRequestAndResponse(request,response);// jshint ignore:line
  };

  /**
   *  Add more functions as needed _this.functionName = function(){} and call them via this.functionName();
   *
   * @param doc :: PipelineDocument
   * @param ctx :: Map<String, Object>
   * @param collection :: String containing the collection name
   * @param solrServer :: org.apache.solr.client.solrj.SolrClient instance pointing at `collection`
   * @param solrServerFactory :: com.lucidworks.apollo.component.SolrClientFactory instance
   * @returns {*}
   */
  _this.doPipelineProcess = function(doc, ctx, collection, solrServer, solrServerFactory) {
    logger.debug('\n\n************JS pipeline script invoked.');
    ctx.put("loadStatus",loadStatusContext);
    //TODO:  add pipeline code here and delete the runTests() call as needed.
    if (util && util.index) {
      util.index.runTests(doc, ctx, collection, solrServerFactory);
    }
    return doc;
  };

  /**
    return a function which will be called by JavascriptStage.java or JavascriptQueryStage.java for each pipeline doc
   */
  return function(){
    //turn the default arguments list passed to all JS functions into an array to avoid
    // complications when passing them to the outer wrapper function
    var invocationArgs = Array.prototype.slice.call(arguments);
    //logger.warn("script load argument count: " + invocationArgs.length);
    if(MODE === 'QUERY') {
      return _this.doPipelineQuery.apply(this, invocationArgs);// jshint ignore:line
    }else {
      return _this.doPipelineProcess.apply(this, invocationArgs);// jshint ignore:line
    }

  }
})();