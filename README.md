# Fusion Pipeline Utilities
These utility files are intended for use in Pipeline Stages used within the Lucidworks Fusion product. 

## Setup
After installing and starting Lucidworks Fusion, place the `utilLib.js` file in the <FUSION_HOME>/scripts directory so that it is publicly readable.

Copy/Paste the contents of `samplePipeline.js` into a new Javascript Index Pipeline Stage or a new Javascript Query Pipeline Stage.  If using a Query Stage, also modify the `MODE` variable to be `MODE = "QUERY"`.

If you wish to reference the `utilLib.js` script from somewhere other than `<FUSION_HOME>/scripts` then also modify the `loadUtilLibrary()` function in samplePipeline.js to reference the location where you placed `utilLib.js`.

### A few things to note

* When `samplePipeline.js` script is first loaded into a pipeline it will automatically attempt to load `utilLib.js`  Progress of this operation can be seen in the logs as well as in the Fusion Workbench in the stage's `context.loadStatus` element.
* If the MODE variable is set to "QUERY", the pipeline script will call `doPipelineQuery()`.  If MODE is not set to "QUERY" the `doPipelineProcess()` function will be called.  By default these simply call unit test scripts within the utility library via `util.index.runTests()` or `util.query.runTests()` respectively.  Remove/replace these calls as needed.