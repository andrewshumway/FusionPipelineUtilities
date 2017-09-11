/**
 *
 * library of "static" untility functions useful in index or query pipeline stages.
 * 
 */
/* globals  Java,arguments*/
(function(){
    "use strict";

    /* TODO: ideas
     set doc id
     concat two or more fields
     Solr date to Date and back
     Merge two documents
     MV field to SV field
     replace whitespace and newlines
     to and from Base64
      */
    var JavaString = Java.type('java.lang.String');
    var JavaDate = Java.type('java.util.Date');
    var System = Java.type('java.lang.System');
    var FileInputStream = Java.type('java.io.FileInputStream');
    var InputStream = Java.type('java.io.InputStream');
    var Properties = Java.type('java.util.Properties');
    var LinkedHashMap = Java.type('java.util.LinkedHashMap');
    var ArrayList = Java.type('java.util.ArrayList');
    var SimpleDateFormat = Java.type('java.text.SimpleDateFormat');
    var Calendar = Java.type('java.util.Calendar');
    var Base64 = Java.type('java.util.Base64');

    var HttpClientBuilder = Java.type('org.apache.http.impl.client.HttpClientBuilder');
    var HttpGet = Java.type('org.apache.http.client.methods.HttpGet');
    var IOUtils = Java.type('org.apache.commons.io.IOUtils');
    //the default SolrQuery extends ModifiableSolrjParams
    var SolrQuery = Java.type('org.apache.solr.client.solrj.SolrQuery');

    var SecretKeySpec = Java.type('javax.crypto.spec.SecretKeySpec');
    var Cipher = Java.type('javax.crypto.Cipher');

    var PipelineDocument = Java.type('com.lucidworks.apollo.common.pipeline.PipelineDocument');
    var PipelineField = Java.type('com.lucidworks.apollo.common.pipeline.PipelineField');

    /**
     * begin definition of file globals.  Anything not returned at the bottom will
     * be private
     */
    var ISO8601DATEFORMAT = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ");
    ISO8601DATEFORMAT.setCalendar(Calendar.getInstance(java.util.TimeZone.getTimeZone('UTC')));

    var makeTestContextWrapper = function(globalContext,name){
        var testTag = '_runtime_test_results';
        var mainMap = globalContext.get(testTag);
        if(! mainMap){
            mainMap = new LinkedHashMap();
            globalContext.put(testTag, mainMap);
        }
        var groupMap = mainMap.get(name);
        if(! groupMap){
            groupMap = new LinkedHashMap();
            mainMap.put(name, groupMap);
        }
        return groupMap;
    };
    /**
     * TODO:  as more html tokens are encountered, add them to this array
     * list of html tokens to include int the search-replace
     * @type {{re: RegExp, rv: string}[]}
     */
    var replacements =  [
        { re:/&nbsp;/g, rv:' ' },{ re:/&ensp;/g, rv:' ' },{ re:/&emsp;/g, rv:' ' },{ re:/&thinsp;/g, rv:' ' },{ re:/&zwnj;/g, rv:' ' },{ re:/&shy;/g, rv:' ' },{ re:/&lrm;/g, rv:' ' },{ re:/&rlm;/g, rv:' ' },{ re:/&zwj;/g, rv:' ' }
        /*
        *  The following are symbols which can be replaced.  This will likely be slow on long Strings. 
        *  Making a regex such as "\&[a-z,A-Z]{2,8};" which first finds all of the &xyz; type tokens and then looks them up and just searches for those
        *  would be much better but until someone writes it this is what we've got.
         */
        ,{ re:/&amp;/g, rv:'\u0026' },{ re:/&lt;/g, rv:'\u003C' },{ re:/&gt;/g, rv:'\u003E' },{ re:/&iexcl;/g, rv:'\u00A1' },{ re:/&cent;/g, rv:'\u00A2' }
        ,{ re:/&pound;/g, rv:'\u00A3' },{ re:/&curren;/g, rv:'\u00A4' },{ re:/&yen;/g, rv:'\u00A5' },{ re:/&brvbar;/g, rv:'\u00A6' },{ re:/&sect;/g, rv:'\u00A7' },{ re:/&uml;/g, rv:'\u00A8' }
        ,{ re:/&copy;/g, rv:'\u00A9' },{ re:/&ordf;/g, rv:'\u00AA' },{ re:/&laquo;/g, rv:'\u00AB' },{ re:/&reg;/g, rv:'\u00AE' },{ re:/&macr;/g, rv:'\u00AF' },{ re:/&deg;/g, rv:'\u00B0' }
        ,{ re:/&plusmn;/g, rv:'\u00B1' },{ re:/&sup2;/g, rv:'\u00B2' },{ re:/&sup3;/g, rv:'\u00B3' },{ re:/&acute;/g, rv:'\u00B4' },{ re:/&micro;/g, rv:'\u00B5' },{ re:/&para;/g, rv:'\u00B6' }
        ,{ re:/&middot;/g, rv:'\u00B7' },{ re:/&cedil;/g, rv:'\u00B8' },{ re:/&sup1;/g, rv:'\u00B9' },{ re:/&ordm;/g, rv:'\u00BA' },{ re:/&raquo;/g, rv:'\u00BB' },{ re:/&frac14;/g, rv:'\u00BC' }
        ,{ re:/&frac12;/g, rv:'\u00BD' },{ re:/&frac34;/g, rv:'\u00BE' },{ re:/&iquest;/g, rv:'\u00BF' },{ re:/&Agrave;/g, rv:'\u00C0' },{ re:/&Aacute;/g, rv:'\u00C1' },{ re:/&Acirc;/g, rv:'\u00C2' }
        ,{ re:/&Atilde;/g, rv:'\u00C3' },{ re:/&Auml;/g, rv:'\u00C4' },{ re:/&Aring;/g, rv:'\u00C5' },{ re:/&AElig;/g, rv:'\u00C6' },{ re:/&Ccedil;/g, rv:'\u00C7' },{ re:/&Egrave;/g, rv:'\u00C8' }
        ,{ re:/&Eacute;/g, rv:'\u00C9' },{ re:/&Ecirc;/g, rv:'\u00CA' },{ re:/&Euml;/g, rv:'\u00CB' },{ re:/&Igrave;/g, rv:'\u00CC' },{ re:/&Iacute;/g, rv:'\u00CD' },{ re:/&Icirc;/g, rv:'\u00CE' }
        ,{ re:/&Iuml;/g, rv:'\u00CF' },{ re:/&ETH;/g, rv:'\u00D0' },{ re:/&Ntilde;/g, rv:'\u00D1' },{ re:/&Ograve;/g, rv:'\u00D2' },{ re:/&Oacute;/g, rv:'\u00D3' },{ re:/&Ocirc;/g, rv:'\u00D4' }
        ,{ re:/&Otilde;/g, rv:'\u00D5' },{ re:/&Ouml;/g, rv:'\u00D6' },{ re:/&times;/g, rv:'\u00D7' },{ re:/&Oslash;/g, rv:'\u00D8' },{ re:/&Ugrave;/g, rv:'\u00D9' },{ re:/&Uacute;/g, rv:'\u00DA' }
        ,{ re:/&Ucirc;/g, rv:'\u00DB' },{ re:/&Uuml;/g, rv:'\u00DC' },{ re:/&Yacute;/g, rv:'\u00DD' },{ re:/&THORN;/g, rv:'\u00DE' },{ re:/&szlig;/g, rv:'\u00DF' },{ re:/&agrave;/g, rv:'\u00E0' }
        ,{ re:/&aacute;/g, rv:'\u00E1' },{ re:/&acirc;/g, rv:'\u00E2' },{ re:/&atilde;/g, rv:'\u00E3' },{ re:/&auml;/g, rv:'\u00E4' },{ re:/&aring;/g, rv:'\u00E5' },{ re:/&aelig;/g, rv:'\u00E6' }
        ,{ re:/&ccedil;/g, rv:'\u00E7' },{ re:/&egrave;/g, rv:'\u00E8' },{ re:/&eacute;/g, rv:'\u00E9' },{ re:/&ecirc;/g, rv:'\u00EA' },{ re:/&euml;/g, rv:'\u00EB' },{ re:/&igrave;/g, rv:'\u00EC' }
        ,{ re:/&iacute;/g, rv:'\u00ED' },{ re:/&icirc;/g, rv:'\u00EE' },{ re:/&iuml;/g, rv:'\u00EF' },{ re:/&eth;/g, rv:'\u00F0' },{ re:/&ntilde;/g, rv:'\u00F1' },{ re:/&ograve;/g, rv:'\u00F2' }
        ,{ re:/&oacute;/g, rv:'\u00F3' },{ re:/&ocirc;/g, rv:'\u00F4' },{ re:/&otilde;/g, rv:'\u00F5' },{ re:/&ouml;/g, rv:'\u00F6' },{ re:/&divide;/g, rv:'\u00F7' },{ re:/&oslash;/g, rv:'\u00F8' }
        ,{ re:/&ugrave;/g, rv:'\u00F9' },{ re:/&uacute;/g, rv:'\u00FA' },{ re:/&ucirc;/g, rv:'\u00FB' },{ re:/&uuml;/g, rv:'\u00FC' },{ re:/&yacute;/g, rv:'\u00FD' },{ re:/&thorn;/g, rv:'\u00FE' }
        ,{ re:/&yuml;/g, rv:'\u00FF' },{ re:/&fnof;/g, rv:'\u0192' },{ re:/&Alpha;/g, rv:'\u0391' },{ re:/&Beta;/g, rv:'\u0392' },{ re:/&Gamma;/g, rv:'\u0393' },{ re:/&Delta;/g, rv:'\u0394' }
        ,{ re:/&Epsilon;/g, rv:'\u0395' },{ re:/&Zeta;/g, rv:'\u0396' },{ re:/&Eta;/g, rv:'\u0397' },{ re:/&Theta;/g, rv:'\u0398' },{ re:/&Iota;/g, rv:'\u0399' },{ re:/&Kappa;/g, rv:'\u039A' }
        ,{ re:/&Lambda;/g, rv:'\u039B' },{ re:/&Mu;/g, rv:'\u039C' },{ re:/&Nu;/g, rv:'\u039D' },{ re:/&Xi;/g, rv:'\u039E' },{ re:/&Omicron;/g, rv:'\u039F' },{ re:/&Pi;/g, rv:'\u03A0' }
        ,{ re:/&Rho;/g, rv:'\u03A1' },{ re:/&Sigma;/g, rv:'\u03A3' },{ re:/&Tau;/g, rv:'\u03A4' },{ re:/&Upsilon;/g, rv:'\u03A5' },{ re:/&Phi;/g, rv:'\u03A6' },{ re:/&Chi;/g, rv:'\u03A7' }
        ,{ re:/&Psi;/g, rv:'\u03A8' },{ re:/&Omega;/g, rv:'\u03A9' },{ re:/&alpha;/g, rv:'\u03B1' },{ re:/&beta;/g, rv:'\u03B2' },{ re:/&gamma;/g, rv:'\u03B3' },{ re:/&delta;/g, rv:'\u03B4' }
        ,{ re:/&epsilon;/g, rv:'\u03B5' },{ re:/&zeta;/g, rv:'\u03B6' },{ re:/&eta;/g, rv:'\u03B7' },{ re:/&theta;/g, rv:'\u03B8' },{ re:/&iota;/g, rv:'\u03B9' },{ re:/&kappa;/g, rv:'\u03BA' }
        ,{ re:/&lambda;/g, rv:'\u03BB' },{ re:/&mu;/g, rv:'\u03BC' },{ re:/&nu;/g, rv:'\u03BD' },{ re:/&xi;/g, rv:'\u03BE' },{ re:/&omicron;/g, rv:'\u03BF' },{ re:/&pi;/g, rv:'\u03C0' }
        ,{ re:/&rho;/g, rv:'\u03C1' },{ re:/&sigmaf;/g, rv:'\u03C2' },{ re:/&sigma;/g, rv:'\u03C3' },{ re:/&tau;/g, rv:'\u03C4' },{ re:/&upsilon;/g, rv:'\u03C5' },{ re:/&phi;/g, rv:'\u03C6' }
        ,{ re:/&chi;/g, rv:'\u03C7' },{ re:/&psi;/g, rv:'\u03C8' },{ re:/&omega;/g, rv:'\u03C9' },{ re:/&thetasym;/g, rv:'\u03D1' },{ re:/&upsih;/g, rv:'\u03D2' },{ re:/&piv;/g, rv:'\u03D6' }
        ,{ re:/&bull;/g, rv:'\u2022' },{ re:/&hellip;/g, rv:'\u2026' },{ re:/&prime;/g, rv:'\u2032' },{ re:/&Prime;/g, rv:'\u2033' },{ re:/&oline;/g, rv:'\u203E' },{ re:/&frasl;/g, rv:'\u2044' }
        ,{ re:/&trade;/g, rv:'\u2122' },{ re:/&larr;/g, rv:'\u2190' },{ re:/&uarr;/g, rv:'\u2191' },{ re:/&rarr;/g, rv:'\u2192' },{ re:/&darr;/g, rv:'\u2193' },{ re:/&harr;/g, rv:'\u2194' }
        ,{ re:/&prod;/g, rv:'\u220F' },{ re:/&sum;/g, rv:'\u2211' },{ re:/&minus;/g, rv:'\u2212' },{ re:/&radic;/g, rv:'\u221A' },{ re:/&infin;/g, rv:'\u221E' },{ re:/&asymp;/g, rv:'\u2248' }
        ,{ re:/&ne;/g, rv:'\u2260' },{ re:/&equiv;/g, rv:'\u2261' },{ re:/&le;/g, rv:'\u2264' },{ re:/&ge;/g, rv:'\u2265' },{ re:/&loz;/g, rv:'\u25CA' }
        ,{ re:/&spades;/g, rv:'\u2660' },{ re:/&clubs;/g, rv:'\u2663' },{ re:/&hearts;/g, rv:'\u2665' },{ re:/&diams;/g, rv:'\u2666' }
    ];

    /*****************************************
    * put private functions here
     ****************************************/

    /*
     * construct the module (library) with an index section and a query section.
     */
    var index = {}, query ={};
    var util = { index:index, query:query};

    //end file globals

   /*****************************************************************************************
    * functions in the util.query element are inteded for use in a query pipeline where
    * request, response, context, collectionName, solrServer and solrServerFactory are avaliable
    *
    * ***************************************************************************************/
    query.runTests = function (request, response, ctx, collection, solrServer, solrServerFactory){
        //do a sanity check on arguments in case they change in some Fusion version
        /*util.logTypeInfo(request,'request');
        util.logTypeInfo(response,'response');
        util.logTypeInfo(ctx,'ctx');
        util.logTypeInfo(collection,'collection');
        util.logTypeInfo(solrServer,'solrServer');
        util.logTypeInfo(solrServerFactory,'solrServerFactory');
        */

        util.runTests(ctx,collection,solrServerFactory);
        var localCtx = makeTestContextWrapper(ctx,'query');

        //TODO: add query specific tests
    };

    /***************************************************************************************************
     * functions in the util.index element are intended for use in an index pipeline where
     * doc, context, collectionName, and solrServerFactory are available.
     * ************************************************************************************************/
    index.runTests = function(doc,ctx,collection,solrServerFactory){

        util.runTests(ctx,collection,solrServerFactory);
        var localCtx = makeTestContextWrapper(ctx,'index');
         //make a fake doc to test with.
        var tester = PipelineDocument.newDocument("TestRecord_ID_0");
        var fv = new ArrayList();
        fv.add("   this ");
        fv.add(' \nfield ');
        fv.add('  has      whitespace   ');
        tester.addFields('whitespace_ss',fv);
        fv.clear();
        fv.add('this ');
        fv.add('is a ');
        fv.add('multivalued string');
        tester.addFields('mvstring_ss',fv);

        //do tests
        var params = [tester,'__test_field__'];
        tester.addField('__test_field__','test_field');
        util.doTest( localCtx, 'getFieldNames', params,  index.getFieldNames, "__test_field__");

        var params = [tester, 'mvstring_ss','/'];
        util.doTest(localCtx, 'concatMV', params, index.concatMV,'this /is a /multivalued string');

        var params = [tester,'whitespace_ss'];
        var formatter = function(result){
            var fv = tester.getFieldValues('whitespace_ss');
            logger.info('\n*********\n* formatter result is ' + fv);
            return fv.toString();
        };
        util.doTest(localCtx, 'trimField',params,index.trimField, '[this, field, has whitespace]', formatter);

        tester.addField('_raw_content_', new JavaString('byte[] to String').getBytes('UTF-8'));

        var params = [tester,'_raw_content_'];
        util.doTest(localCtx, 'rawField2String', params, index.rawField2String,'byte[] to String');

        //logger.info('\n\n************\n* bye  :  \n*****************************\n\n');
    };
    util.raw2String = function(byteArray,charset){
        charset = charset || 'UTF-8';
        if(byteArray) {
            return new JavaString(byteArray,charset);
        }
    };
    /**
     *
     * @param doc PipelineDocument
     * @param fieldname fieldname containing byte[] e.g. _raw_content_
     * @param charset  optional charset encoding name.  Default 'UTF-8'
     * @return {string} Java String object or, if doc[fieldname] is empty, ''.
     */
    index.rawField2String = function(doc,fieldname, charset){
        var bytes = doc.getFirstFieldValue(fieldname); //this should be a byte array
        var s = '';
        if(bytes){
            s = util.raw2String(bytes,charset);
        }
        return s;
    };
    /** spin thru all field names and return the ones matching the pattern
     * For example, parsers which handle document nesting sometimes produce lists of fields such as
     * email.0.name="work", email.1.name="personal"... and
     * email.0.value='jsmith@corp.com', email.1.value='jsmith@yahoo.com' etc.
     *
     * Calling this function with a pattern such as 'email.*value' will return ['email.0.value','email.1.value']
     * In effect it extracts the field names of interest.
     *
     * @param doc  The index PipelineDocument
     * @param pattern a regex used to find field names default = '.*'
     */
    index.getFieldNames = function(doc, pattern){
        pattern = pattern || '.*';
        var fNames = doc.getFieldNames(); // ::Set<String>
        var matched = [];
        fNames.forEach(function (key){
            //logger.info('checking field ' + key + ' against pattern ' + pattern );
            if(key.matches(pattern)){
                // logger.info('matched! ' + key );
                matched.push(key);
            }
        });
        return matched;
    };

    /**
     * concatenate all elements of a multi-valued field named 'name' separated by a delimiter string
     * So if a doc has name_ss containing ['joe','jose','joseph','joe'] this function will
     * return the String "joe, jose, joseph".
     *
     * @param doc - the doc who's field values will be concatenated
     * @param name - the name of the multi-valued field with the values to concatenate
     * @param delim - optional delimiter default == ', '
     */
    index.concatMV = function(doc,name, delim){
        delim = delim || ', ';
        var concat = [];
        doc.getFieldValues(name).forEach(function (val){
            concat.push(val);
        });
        return util.dedup( concat).join(delim);
    };

    /**
     *  Remove whitespace from all elements of the field called fieldName.  Beginning and trailing whitespace is trimmed
     *  and redundant internal whitespace is reduced to ' '.
     * @param doc
     * @param fieldName
     */
    index.trimField = function(pdoc, fieldName){
        var fa = new ArrayList();
        var field;
        var fields = pdoc.getFieldValues(fieldName);
        logger.info('got fields '+ fields);
        for(var i in fields){
            field = fields[i];
            var typ = util.getTypeOf(field);
            if("string" === typ  || 'String' === typ){
                field = util.trimWhitespace(field);
                fa.add(field);
                //logger.info('\n********\n* pushing type  '+ typ + ' trimmed val: ' + field);
            }else {
                //logger.info('\n******\n* pushing type  '+ typ + ' val: ' + field);
                fa.add(field);
            }
        }
        logger.info('replacing '+ fieldName + ' with: ' + fa);
        if(! fa.isEmpty()) {
            pdoc.setFields(fieldName,fa);
        }
    };

    /**********************************************************************************************************
     *            UTIL functions.  These should not require doc, request, response or other pipeline specific objects
     *********************************************************************************************************/
    util.logTypeInfo = function(obj,name){
        var type = util.getTypeOf(obj);
        logger.info('Variable called "' + name + '" IS A "' + type + '"');
    };

    /**
     * Remove whitespace from start and end of str.  Also remove redundant whitespace (set to space).
     * @param str
     * @return {string}
     */
    util.trimWhitespace = function(str){
        var val = null !=str?str.toString().trim():"";
        //now remove the redundant inner whitespace
        val = val.replace(/\s+/g, " ");
        return val;
    };

    /**
     *
     * @param varargs  One or more arguments which can be String or String[].  These will all be concatenated together
     * into a single String[] and returned
     */
    util.concat = function(varargs){
        var invocationArgs = Array.prototype.slice.call(arguments);
        logger.error("\n********\n* concat args: " + invocationArgs);
        var a = [];
        for(var i = 0; i < invocationArgs.length; i++){
            var arg = invocationArgs[i];
            if(Array.isArray(arg)){
                a = a.concat(arg);
            }else if(typeof(arg) === typeof(String())){
                a.push(arg);
            }else if(util.isJavaType(arg)){
                a.push(arg.toString());
            }
        }
        return a.join('');
    };
    /**
     * Turn a JS or Java Date object into an ISO 8601 formatted String (YYYY-MM-DDTHH:mm:ss.sssZ)
     *
     * @param d
     */
    util.dateToISOString = function(d){

        if(util.isJavaType(d) && 'java.util.date' == d.getClass().getName() ){
            return ISO8601DATEFORMAT.format();
        }else if( util.getTypeOf(d) === 'date' ){
            return d.toISOString();
        }
        return null;
    };
    /**
     * turn an ISO8601 formatted String into a Java Date( YYYY-MM-DDTHH:mm:ss.sssZ)
     * @param s
     */
    util.isoStringToDate = function(s){
        if(s ){
         return ISO8601DATEFORMAT.parse(s);
        }
    };
    util.runTests = function(ctx){
        var localCtx = makeTestContextWrapper(ctx,'util');
        var params = [['a','b','c','a','b']];
        util.doTest(localCtx, 'dedup', params,  util.dedup, 'a,b,c');

        params = ["<span data-attr='one'>inner &nbsp;text </span>"];
        util.doTest(localCtx, 'stripTags', params,  util.stripTags,' inner  text ');

        params = ["Lorem Ipsum text",
            10,true
        ];
        util.doTest(localCtx, 'truncateString', params,  util.truncateString,"Lorem");
        params[2] = false;
        util.doTest(localCtx, 'truncateString2', params,  util.truncateString,"Lorem Ips");

        params = ["http://ip.jsontest.com"];
        util.doTest(localCtx, 'queryHttp2Json', params,  util.queryHttp2Json,'{"ip":"63.238.47.2"}', JSON.stringify);

        params = ['P@$$w0rd'];
        util.doTest(localCtx, 'encrypt String', params,  util.encrypt,'pWwEhTKVSiqXWd06oAs5Sw==');

        params = [util.encrypt('P@$$w0rd')];
        util.doTest(localCtx, 'decrypt String', params,  util.decrypt,'P@$$w0rd');

        params = ['this',',',new JavaString(' is'),[' a', ' test']];
        util.doTest(localCtx, 'concat', params,  util.concat,'this, is a test');

        params = ['   the   string  \n  has \r\n whitespace   ' ];
        util.doTest(localCtx, 'trimWhitespace', params,  util.trimWhitespace,'the string has whitespace');


    };
    /**
     * run a test function and send results to the ctx object
     * @param outCtxObj  The context object onto which results are added.
     * @param testName  String name of the test
     * @param params    Array of parameters to pass to the testFunction
     * @param testFunc  testFunction callback
     * @param expected  expected result from testFunction
     * @param formatter optional formatter callback to format result into human-readable result
     *
     * @return void but results will be added to coutCtxObj[testName]
     */
    util.doTest = function( outCtxObj, testName, params, testFunc, expected,formatter) {
        if (typeof formatter !== 'function') {
            formatter = function (testResult) {
                return new JavaString(testResult.toString());
            };
        }
        params = params || [];
        var pString = params.toString();
        if(pString.length() > 35){
            pString = util.truncateString(pString,35) + '... ';
        }
        var testDesc = new JavaString( testName + "(" + pString + ")='");
        //logger.info("\n*****\n* this:"+this);
        //logger.info("\n*****\n* params:"+params);
        var result = testFunc.apply(this, params);
        result = formatter(result);
        var passed = result == expected;
        if( passed || !expected ) {
            logger.info(testDesc + result + "'");
            outCtxObj.put(testDesc, result);
        }else{
            logger.error('\n\n***********\n* Utility test ' + testName + ' Failed.\n* Actual  : "' + result + '"\n* Expected: "' + expected + '"\n**************');
            outCtxObj.put(new JavaString("FAILED! " + testDesc), result);
        }
    };
    /**
     * Test an object to see if it looks like a Java Object
     * @param obj
     * @return true if the object is valued and contains getClass, notify and hashCode functions.
     */
    util.isJavaType = function(obj){
        return (obj && typeof obj.getClass === 'function' && typeof obj.notify === 'function' && typeof obj.hashCode === 'function');

    };
    /**
     * For Java objects return the simplified version of their classname e.g. 'String' for a java.lang.String
     * Java naming conventions call for upper case in the first character.
     * 
     * For JavaScript objects, the type will be a lower case string e.g. 'string' for a javascript String
     *
     */
    util.getTypeOf = function getTypeOf(obj){
        'use strict';
        var typ = 'unknown';
        //test for java objects
        if( util.isJavaType(obj)){
            typ = obj.getClass().getSimpleName();
        }else if (obj === null){
            typ = 'null';
        }else if (typeof(obj) === typeof(undefined)){
            typ = 'undefined';
        }else if (typeof(obj) === typeof(String())){
            typ = 'string';
        }else if (typeof(obj) === typeof([])) {
            typ = 'array';
        }
        else if (Object.prototype.toString.call(obj) === '[object Date]'){
                typ = 'date';
        }else {
            typ = obj ? typeof(obj) :typ;
        }
        return typ;
    };

    /**
     * dedup an array by pushing each value into a map and then pulling them back.
     * @param a the JavaScript array to dedup
     */
    util.dedup = function(arr){

        var set = {};
        var dedup = [];
        for(var i = 0; i < arr.length; i++){
            set[arr[i]]='';
        }
        //logger.info('\n\nDEDUP set is' + set +  '\n\n');
        //turn deduped set to array
        for (var p in set) {
            if( set.hasOwnProperty(p) ) {
                dedup.push(p);
            }
        }
        return dedup;
    };
    /**
     * Strip out HTML tags
     * @param value
     * @returns {XML|void|string}
     */
    util.stripTags = function(value){
        var stripped = value.replace(/[<][^>]*[>]/ig, ' ');
        //replace duplicate white space
        stripped = stripped.replace(/\s+/g, ' ');

        for(var i = 0; i < replacements.length; i++){
            var rp = replacements[i];
            stripped = stripped.replace(rp.re,rp.rv);
        }
        return stripped;
    };
    /**
     * chop a string to n characters
     * @param s
     * @param n
     * @param useWordBoundary
     * @returns {string}
     */
    util.truncateString = function(s, n, useWordBoundary){
        s = s || '';
        var s_;
        var isTooLong = s.length > n;
        s_ = isTooLong ? s.substr(0, n - 1) : s;
        s_ = (useWordBoundary && isTooLong) ? s_.substr(0, s_.lastIndexOf(' ')) : s_;
        return s_;
    };

    util.queryHttp = function (url){

        logger.debug('BUILDING HTTP REQUEST : ' );
        var client = HttpClientBuilder.create().build();
        var request = new HttpGet(url);
        logger.debug('SUBMITTING HTTP REQUEST : ' + request);
        var rsp = client.execute(request);

        return rsp;
    };
    util.queryHttp2String = function(url) {
        var responseString = "";
        var rsp = this.queryHttp(url);
        logger.debug('MESSAGE got resp: ' + rsp );
        if (rsp && rsp.getEntity()) {
            responseString = IOUtils.toString(rsp.getEntity().getContent(), 'UTF-8');
        }
        return responseString
    };
    /**
     * Perform an HTTP GET request for a URL and parse the results to JSON.
     * Note: for example simplicity we assume the response holds a JSON formatted UTF-8 string.
     */
    util.queryHttp2Json =function(url){
        var responseString = this.queryHttp2String(url);
        logger.info('MESSAGE HTTP_GET resp: ' + responseString );
        return JSON.parse(responseString);
    };

    /**
     *
     * @param collectionName  name of the collection being queried by Solr
     * @param solrServerFactory  The factory used to create/get the SolrClient object.  This is a pipeline stage parameter
     * @returns solrClient
     */
    util.makeSolrClient = function(collectionName, solrServerFactory){
        //logger.info('solrServerFactory isa: ' + util.getTypeOf(solrServerFactory));
        var solrClient = solrServerFactory.getSolrServer(collectionName);
        return solrClient;
    };
    /**
     * Delete a known document from Solr.
     *
     * Note:  unless you call some form of client.commit()  you may not see this for a while.
     *
     * @param solrClient The SolrJ client AKA solrServer
     * @param id
     * @return  the org.apache.solr.client.solrj.response.UpdateResponse
     */
    util.deleteById = function(id,solrClient){
        var response;
        try {
            if(solrClient) {
                response = solrClient.deleteById(id);
                //check response
                if(response.getStatus() != 200){
                    logger.warn("got not 200 status (" + response.getStatus() + ")when attempting to delete Solr document " + id);
                }
            }
        }catch (error) {
            logger.error("Error deleting from Solr for id:'" + id + "'" + error);
        }
        return response;
    };

    /**
     * sample function intended for copy-paste reuse
     *
     * @param query Solr query i.e. '*:*'
     * @param solrClient
     * @return  the org.apache.solr.client.solrj.response.UpdateResponse
     */
    util.querySolr = function(query, solrClient) {
        var q = query || '*:*';
        try {
            var sq = new SolrQuery(q);
            //
            var resp = solrClient.query(sq);
            /*
             var cnt = 0;
             var message = '';
             resp.getResults().forEach(function (respDoc) {
             message += ('\n\tmessage_t for result ' + (cnt++) + ' is: ' + respDoc.getFirstValue('message_t') );
             });
             logger.info('\n\nMessages: ' + message); 
             */
            return resp;
        } catch (error) {
            logger.error("Error querying solr for '" + query + "' Err: " + error);
        }
        return null;
    };
    /**
     *
     * @returns path of $FUSION_HOME
     */
    util.getFusionHomeDir = function(){
        // should we be using java.lang.System.getProperty('apollo.home')??
        //This is set in the environment of the java process which launches Fusion
        var fh = java.lang.System.getProperty('apollo.home');
        // var fh = null;
        // if(env){
        //     fh = env.get('FUSION_HOME');
        // }
        return fh;
    };
    /**
     *
     * @returns Properties object holding the $FUSION_HOME/conf/fusion.properties
     */
    util.getFusionConfigProperties = function(){
        var HOME = util.getFusionHomeDir();
        var S = System.getProperty('file.separator');
        var configFilePath = HOME + S + 'conf' + S + 'fusion.properties';
        return util.readPropFile(configFilePath);
    };
    /**
     * @param filename as a String
     * @return Properties
     */
    util.readPropFile = function(filename){
        var prop = new Properties();
        var input = null;
        try{
            input = new FileInputStream(filename);
            // load a properties file
            prop.load(input);
        }
        catch(ex){
            logger.error('*** could not read ' + filename );
            logger.error(ex);
        }
        finally{
            if(input){
                input.close();
            }
        }
        return prop;
    };
    /**
     *
     * @param toEncrypt string to encrypt
     * @param cipherKey  cipher key of 16, 24, or 32 bytes in length (8, 12 or 16 chars)
     * @returns encrypted string
     */
    util.encrypt = function(toEncrypt, cipherKey){
        cipherKey = cipherKey || 'Unkn0wnK3y$trlng';
        var text = new JavaString(toEncrypt);
        var key = new JavaString(cipherKey);
        var aesKey = new SecretKeySpec(key.getBytes(),'AES');
        var cipher = Cipher.getInstance('AES');
        cipher.init(Cipher.ENCRYPT_MODE, aesKey);
        var encryptedBytes = cipher.doFinal(text.getBytes());
        var encoder = Base64.getEncoder();
        var encryptedString = encoder.encodeToString(encryptedBytes);
        logger.debug('encrypted ' + toEncrypt + ' as ' + encryptedString);
        return encryptedString;
    };
    /**
     * @param toDecrypt
     * @param cipherKey  cipher key of 16, 24, or 32 bytes in length (8, 12 or 16 chars)
     * @return decrypted string
     */
    util.decrypt = function(toDecrypt, cipherKey){
        cipherKey = cipherKey || 'Unkn0wnK3y$trlng';
        var key = new JavaString(cipherKey);
        var aesKey = new SecretKeySpec(key.getBytes(),'AES');
        var encryptedString = new JavaString(toDecrypt);
        var decoder = Base64.getDecoder();
        var cipher = Cipher.getInstance('AES');
        cipher.init(Cipher.DECRYPT_MODE, aesKey);
        var decrypted = new JavaString(cipher.doFinal(decoder.decode(encryptedString)));
        logger.debug('decrypted ' + toDecrypt + ' as ' + decrypted);
        return decrypted;
    };


    //by returning util, it (as well as util.index and util.query) will be accessible/public.
    return util;
}).call(this); // jshint ignore: line

