import './node_modules/dashkeys/dashkeys.js';
import './node_modules/dashsight/dashsight.js';
import './node_modules/dashsight/dashsocket.js';
import './node_modules/crowdnode/dashapi.js';
import './node_modules/crowdnode/crowdnode.js';

import * as DashKeysTypes from './node_modules/dashkeys/dashkeys.js';
import * as DashSightTypes from './node_modules/dashsight/dashsight.js';
import * as DashSocketTypes from './node_modules/dashsight/dashsocket.js';
import * as DashApiTypes from './node_modules/crowdnode/dashapi.js';
import * as CrowdNodeTypes from './node_modules/crowdnode/crowdnode.js';

/** @type {DashKeysTypes} */
export let DashKeys = window?.DashKeys || globalThis?.DashKeys
/** @type {DashSightTypes} */
export let DashSight = window?.DashSight || globalThis?.DashSight
/** @type {DashSocketTypes} */
export let DashSocket = window?.DashSocket || globalThis?.DashSocket
/** @type {DashApiTypes} */
export let DashApi = window?.DashApi || globalThis?.DashApi
/** @type {CrowdNodeTypes} */
export let CrowdNode = window?.CrowdNode || globalThis?.CrowdNode

export default {
  DashKeys,
  DashSight,
  DashSocket,
  DashApi,
  CrowdNode,
}
