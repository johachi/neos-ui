import produce from 'immer';
import {defaultsDeep} from 'lodash'
import {action as createAction, ActionType} from 'typesafe-actions';
import {actionTypes as system, InitAction} from '@neos-project/neos-ui-redux-store/src/System';

import * as selectors from './selectors';
import {parentNodeContextPath, getNodeOrThrow} from './helpers';

import {FusionPath, NodeContextPath, InsertPosition, NodeMap, ClipboardMode, NodeTypeName} from '@neos-project/neos-ts-interfaces';

interface InlineValidationErrors {
    [itemProp: string]: any;
}

interface ErrorsMap {
    [itemProp: string]: any;
}

//
// Export the subreducer state shape interface
//
export interface State extends Readonly<{
    byContextPath: NodeMap;
    siteNode: NodeContextPath | null;
    documentNode: NodeContextPath | null;
    focused: {
        contextPath: NodeContextPath | null;
        fusionPath: FusionPath | null;
    },
    toBeRemoved: NodeContextPath | null;
    clipboard: NodeContextPath | null;
    clipboardMode: ClipboardMode | null;
    inlineValidationErrors: InlineValidationErrors
}> {}

export const defaultState: State = {
    byContextPath: {},
    siteNode: null,
    documentNode: null,
    focused: {
        contextPath: null,
        fusionPath: null
    },
    toBeRemoved: null,
    clipboard: null,
    clipboardMode: null,
    inlineValidationErrors: {}
};

// An object describing a node property change
export interface PropertyChange extends Readonly<{
    subject: NodeContextPath;
    propertyName: string;
    value: any;
}> {}

//
// Export the action types
//
export enum actionTypes {
    ADD = '@neos/neos-ui/CR/Nodes/ADD',
    MERGE = '@neos/neos-ui/CR/Nodes/MERGE',
    CHANGE_PROPERTY = '@neos/neos-ui/CR/Nodes/CHANGE_PROPERTY',
    FOCUS = '@neos/neos-ui/CR/Nodes/FOCUS',
    UNFOCUS = '@neos/neos-ui/CR/Nodes/UNFOCUS',
    COMMENCE_CREATION = '@neos/neos-ui/CR/Nodes/COMMENCE_CREATION',
    COMMENCE_REMOVAL = '@neos/neos-ui/CR/Nodes/COMMENCE_REMOVAL',
    REMOVAL_ABORTED = '@neos/neos-ui/CR/Nodes/REMOVAL_ABORTED',
    REMOVAL_CONFIRMED = '@neos/neos-ui/CR/Nodes/REMOVAL_CONFIRMED',
    REMOVE = '@neos/neos-ui/CR/Nodes/REMOVE',
    SET_DOCUMENT_NODE = '@neos/neos-ui/CR/Nodes/SET_DOCUMENT_NODE',
    SET_STATE = '@neos/neos-ui/CR/Nodes/SET_STATE',
    RELOAD_STATE = '@neos/neos-ui/CR/Nodes/RELOAD_STATE',
    COPY = '@neos/neos-ui/CR/Nodes/COPY',
    CUT = '@neos/neos-ui/CR/Nodes/CUT',
    MOVE = '@neos/neos-ui/CR/Nodes/MOVE',
    PASTE = '@neos/neos-ui/CR/Nodes/PASTE',
    COMMIT_PASTE = '@neos/neos-ui/CR/Nodes/COMMIT_PASTE',
    HIDE = '@neos/neos-ui/CR/Nodes/HIDE',
    SHOW = '@neos/neos-ui/CR/Nodes/SHOW',
    UPDATE_URI = '@neos/neos-ui/CR/Nodes/UPDATE_URI',
    SET_INLINE_VALIDATION_ERRORS = '@neos/neos-ui/CR/Nodes/SET_INLINE_VALIDATION_ERRORS'
}

export type Action = ActionType<typeof actions>;

/**
 * Adds nodes to the application state. Completely *replaces*
 * the nodes from the application state with the passed nodes.
 *
 * @param {Object} nodeMap A map of nodes, with contextPaths as key
 */
const add = (nodeMap: NodeMap) => createAction(actionTypes.ADD, {nodeMap});

/**
 * Adds/Merges nodes to the application state. *Merges*
 * the nodes from the application state with the passed nodes.
 *
 * @param {Object} nodeMap A map of nodes, with contextPaths as key
 */
const merge = (nodeMap: NodeMap) => createAction(actionTypes.MERGE, {nodeMap});

/**
 * Updates node properties according to `propertyChanges` array
 */
const changeProperty = (propertyChanges: ReadonlyArray<PropertyChange>) => createAction(actionTypes.CHANGE_PROPERTY, {propertyChanges});

/**
 * Marks a node as focused
 *
 * @param {String} contextPath The context path of the focused node
 * @param {String} fusionPath The fusion path of the focused node, needed for out-of-band-rendering, e.g. when
 *                            adding new nodes
 */
const focus = (contextPath: NodeContextPath, fusionPath: FusionPath) => createAction(actionTypes.FOCUS, {contextPath, fusionPath});

/**
 * Un-marks all nodes as not focused.
 */
const unFocus = () => createAction(actionTypes.UNFOCUS);

/**
 * Start node removal workflow
 *
 * @param {String} contextPath The context path of the node to be removed
 */
const commenceRemoval = (contextPath: NodeContextPath) => createAction(actionTypes.COMMENCE_REMOVAL, contextPath);

/**
 * Start node creation workflow
 *
 * @param {String} referenceNodeContextPath The context path of the referenceNode
 * @param {String} referenceNodeFusionPath (optional) The fusion path of the referenceNode
 * @param {String} preferredMode (optional) The default mode to use in the nodetype selection dialog. Currently not used withing the system but may be useful for extensibility.
 * @param {String} nodeType (optional) If set, then the select nodetype step would be skipped completely. Currently not used withing the system but may be useful for extensibility.
 */
const commenceCreation = (referenceNodeContextPath: NodeContextPath, referenceNodeFusionPath: FusionPath, preferredMode: InsertPosition = InsertPosition.AFTER, nodeType: NodeTypeName | null = null) => createAction(actionTypes.COMMENCE_CREATION, {
    referenceNodeContextPath,
    referenceNodeFusionPath,
    preferredMode,
    nodeType
});

/**
 * Abort the ongoing node removal workflow
 */
const abortRemoval = () => createAction(actionTypes.REMOVAL_ABORTED);

/**
 * Confirm the ongoing removal
 */
const confirmRemoval = () => createAction(actionTypes.REMOVAL_CONFIRMED);

/**
 * Remove the node that was marked for removal
 *
 * @param {String} contextPath The context path of the node to be removed
 */
const remove = (contextPath: NodeContextPath) => createAction(actionTypes.REMOVE, contextPath);

/**
 * Set the document node and optionally site node
 */
const setDocumentNode = (documentNode: NodeContextPath, siteNode?: NodeContextPath) => createAction(actionTypes.SET_DOCUMENT_NODE, {documentNode, siteNode});

/**
 * Set inline validation errors for property
 */
const setInlineValidationErrors = (node: NodeContextPath, propertyName: string, errors: ErrorsMap | null) => createAction(actionTypes.SET_INLINE_VALIDATION_ERRORS, {node, propertyName, errors});

/**
 * Set CR state on page load or after dimensions or workspaces switch
 */
const setState = (
    {siteNodeContextPath, documentNodeContextPath, nodes, merge}: {
        siteNodeContextPath: NodeContextPath;
        documentNodeContextPath: NodeContextPath;
        nodes: NodeMap;
        merge: boolean;
    }
) => createAction(
    actionTypes.SET_STATE,
    {
        siteNodeContextPath,
        documentNodeContextPath,
        nodes,
        merge
    }
);

/**
 * Reload CR nodes state
 */
const reloadState = ((payload: {
    siteNodeContextPath?: NodeContextPath;
    documentNodeContextPath?: NodeContextPath;
    nodes?: NodeMap;
    merge?: boolean;
} = {}) => {
    const {siteNodeContextPath, documentNodeContextPath, nodes, merge} = payload;
    return createAction(
        actionTypes.RELOAD_STATE,
        {
            siteNodeContextPath,
            documentNodeContextPath,
            nodes,
            merge
        }
    );
});

// This data may be coming from the Guest frame, so we need to re-create it at host/
// Otherwise we get all "can't execute code from a freed script" errors in Edge,
// when the guest frame has been navigated away and old guest frame document was destroyed
const adoptDataToHost = <T>(object: T): T => JSON.parse(JSON.stringify(object));

/**
 * Mark a node for copy on paste
 *
 * @param {String} contextPath The context path of the node to be copied
 */
const copy = (contextPath: NodeContextPath) => createAction(actionTypes.COPY, contextPath);

/**
 * Mark a node for cut on paste
 *
 * @param {String} contextPath The context path of the node to be cut
 */
const cut = (contextPath: NodeContextPath) => createAction(actionTypes.CUT, contextPath);

/**
 * Move a node
 *
 * @param {String} nodeToBeMoved The context path of the node to be moved
 * @param {String} targetNode The context path of the target node
 * @param {String} position "into", "before" or "after"
 */
const move = (
    nodeToBeMoved: NodeContextPath,
    targetNode: NodeContextPath,
    position: InsertPosition
) => createAction(actionTypes.MOVE, {nodeToBeMoved, targetNode, position});

/**
 * Paste the contents of the node clipboard
 *
 * @param {String} contextPath The context path of the target node
 * @param {String} fusionPath The fusion path of the target node, needed for out-of-band-rendering
 */
const paste = (contextPath: NodeContextPath, fusionPath: FusionPath) => createAction(actionTypes.PASTE, {contextPath, fusionPath});

/**
 * Marks the moment when the actual paste request is commited
 *
 */
const commitPaste = (clipboardMode: ClipboardMode) => createAction(actionTypes.COMMIT_PASTE, clipboardMode);

/**
 * Hide the given node draft.documentNode !== action.payload
 *
 * @param {String} contextPath The context path of the node to be hidden
 */
const hide = (contextPath: NodeContextPath) => createAction(actionTypes.HIDE, contextPath);

/**
 * Show the given node
 *
 * @param {String} contextPath The context path of the node to be shown
 */
const show = (contextPath: NodeContextPath) => createAction(actionTypes.SHOW, contextPath);

/**
 * Update uris of all affected nodes after uriPathSegment of a node has changed
 * Must update the node itself and all of its descendants
 *
 * @param {String} oldUriFragment
 * @param {String} newUriFragment
 */
const updateUri = (oldUriFragment: string, newUriFragment: string) => createAction(actionTypes.UPDATE_URI, {oldUriFragment, newUriFragment});

//
// Export the actions
//
export const actions = {
    add,
    merge,
    changeProperty,
    focus,
    unFocus,
    commenceCreation,
    commenceRemoval,
    abortRemoval,
    confirmRemoval,
    remove,
    setDocumentNode,
    setState,
    reloadState,
    copy,
    cut,
    move,
    paste,
    commitPaste,
    hide,
    show,
    updateUri,
    setInlineValidationErrors
};

//
// Export the reducer
//
export const reducer = (state: State = defaultState, action: InitAction | Action) => produce(state, draft => {
    switch (action.type) {
        case system.INIT: {
            draft.byContextPath = action.payload.cr.nodes.byContextPath;
            draft.documentNode = action.payload.cr.nodes.documentNode;
            draft.siteNode = action.payload.cr.nodes.siteNode;
            draft.clipboard = action.payload.cr.nodes.clipboard;
            draft.clipboardMode = action.payload.cr.nodes.clipboardMode;
            break;
        }
        case actionTypes.ADD: {
            const {nodeMap} = action.payload;
            Object.keys(nodeMap).forEach(contextPath => {
                draft.byContextPath[contextPath] = adoptDataToHost(nodeMap[contextPath]);
            });
            break;
        }
        case actionTypes.CHANGE_PROPERTY: {
            const {propertyChanges} = action.payload;
            propertyChanges.forEach(propertyChange => {
                const node = getNodeOrThrow(draft.byContextPath, propertyChange.subject);
                node.properties[propertyChange.propertyName] = propertyChange.value;
            });
            break;
        }
        case actionTypes.MOVE: {
            const {nodeToBeMoved: sourceNodeContextPath, targetNode: targetNodeContextPath, position} = action.payload;

            let baseNodeContextPath;
            if (position === 'into') {
                baseNodeContextPath = targetNodeContextPath;
            } else {
                baseNodeContextPath = parentNodeContextPath(targetNodeContextPath);
                if (baseNodeContextPath === null) {
                    throw new Error(`Target node "{targetNodeContextPath}" doesn't have a parent, yet you are trying to move a node next to it`);
                }
            }

            const sourceNodeParentContextPath = parentNodeContextPath(sourceNodeContextPath);
            if (sourceNodeParentContextPath === null) {
                throw new Error(`The source node "{sourceNodeParentContextPath}" doesn't have a parent, you can't move it`);
            }
            const baseNode = getNodeOrThrow(draft.byContextPath, baseNodeContextPath);
            const sourceNodeParent = getNodeOrThrow(draft.byContextPath, sourceNodeParentContextPath);

            const originalSourceChildren = sourceNodeParent.children;
            const sourceIndex = originalSourceChildren.findIndex(child => child.contextPath === sourceNodeContextPath);
            const childRepresentationOfSourceNode = originalSourceChildren[sourceIndex];

            const processedChildren = baseNode.children;

            if (sourceNodeParentContextPath === baseNodeContextPath) {
                // If moving into the same parent, delete source node from it
                processedChildren.splice(sourceIndex, 1);
            } else {
                // Else delete the source node from its parent
                originalSourceChildren.splice(sourceIndex, 1);
                sourceNodeParent.children = originalSourceChildren;
            }

            // Add source node to the children of the base node, at the right position
            if (position === 'into') {
                processedChildren.push(childRepresentationOfSourceNode);
            } else {
                const targetIndex = processedChildren.findIndex(child => child.contextPath === targetNodeContextPath);
                const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
                processedChildren.splice(insertIndex, 0, childRepresentationOfSourceNode);
            }
            baseNode.children = processedChildren;
            break;
        }
        case actionTypes.MERGE: {
            const {nodeMap} = action.payload;
            Object.keys(nodeMap).forEach(contextPath => {
                // This data may be coming from the Guest frame, so we need to re-create it at host/
                // Otherwise we get all "can't execute code from a freed script" errors in Edge,
                // when the guest frame has been navigated away and old guest frame document was destroyed
                const newNode = adoptDataToHost(nodeMap[contextPath]);
                if (!newNode) {
                    throw new Error('This error should never be thrown, it\'s a way to fool TypeScript');
                }
                const mergedNode = defaultsDeep({}, draft.byContextPath[contextPath], newNode);
                // Force overwrite of children
                if (newNode.children !== undefined) {
                    mergedNode.children = newNode.children;
                }
                // Force overwrite of matchesCurrentDimensions
                if (newNode.matchesCurrentDimensions !== undefined) {
                    mergedNode.matchesCurrentDimensions = newNode.matchesCurrentDimensions;
                }
                draft.byContextPath[contextPath] = mergedNode;
            });
            break;
        }
        case actionTypes.FOCUS: {
            const {contextPath, fusionPath} = action.payload;
            draft.focused.contextPath = contextPath;
            draft.focused.fusionPath = fusionPath;
            break;
        }
        case actionTypes.UNFOCUS: {
            draft.focused.contextPath = null;
            draft.focused.fusionPath = null;
            break;
        }
        case actionTypes.COMMENCE_REMOVAL: {
            draft.toBeRemoved = action.payload;
            break;
        }
        case actionTypes.REMOVAL_ABORTED: {
            draft.toBeRemoved = null;
            break;
        }
        case actionTypes.REMOVAL_CONFIRMED: {
            draft.toBeRemoved = null;
            break;
        }
        case actionTypes.REMOVE: {
            delete draft.byContextPath[action.payload];
            break;
        }
        case actionTypes.SET_DOCUMENT_NODE: {
            if (action.payload.siteNode) {
                draft.siteNode = action.payload.siteNode;
            }
            if (draft.documentNode !== action.payload.documentNode) {
                draft.documentNode = action.payload.documentNode;
                // If context path changed, ensure to reset the "focused node". Otherwise, when switching
                // to different Document nodes and having a (content) node selected previously, the Inspector
                // does not properly refresh. We just need to ensure that everytime we switch pages, we
                // reset the focused (content) node of the page.
                draft.focused.contextPath = null;
                draft.focused.fusionPath = null;
            }
            break;
        }
        case actionTypes.SET_STATE: {
            const {siteNodeContextPath, documentNodeContextPath, nodes, merge} = action.payload;
            draft.siteNode = siteNodeContextPath;
            draft.documentNode = documentNodeContextPath;
            draft.focused.contextPath = null;
            draft.focused.fusionPath = null;
            if (nodes) {
                draft.byContextPath = merge ? defaultsDeep({}, draft.byContextPath, nodes) : nodes;
            }
            break;
        }
        case actionTypes.COPY: {
            draft.clipboard = action.payload;
            draft.clipboardMode = ClipboardMode.COPY;
            break;
        }
        case actionTypes.CUT: {
            draft.clipboard = action.payload;
            draft.clipboardMode = ClipboardMode.MOVE;
            break;
        }
        case actionTypes.COMMIT_PASTE: {
            if (action.payload === ClipboardMode.MOVE) {
                draft.clipboard = null;
                draft.clipboardMode = null;
            }
            break;
        }
        case actionTypes.HIDE: {
            const node = getNodeOrThrow(draft.byContextPath, action.payload);
            node.properties.hidden = true;
            break;
        }
        case actionTypes.SHOW: {
            const node = getNodeOrThrow(draft.byContextPath, action.payload);
            node.properties.hidden = false;
            break;
        }
        case actionTypes.UPDATE_URI: {
            const {oldUriFragment, newUriFragment} = action.payload;
            Object.keys(draft.byContextPath).forEach(contextPath => {
                const node = draft.byContextPath[contextPath];
                if (!node) {
                    throw new Error('This error should never be thrown, it\'s a way to fool TypeScript');
                }
                const nodeUri = node.uri;
                if (
                    nodeUri &&
                    // Make sure to not include false positives by checking that the given segment ends either with "/" or "@"
                    (nodeUri.includes(oldUriFragment + '/') || nodeUri.includes(oldUriFragment + '@'))
                ) {
                    const newNodeUri = nodeUri
                            // Node with changes uriPathSegment
                            .replace(oldUriFragment + '@', newUriFragment + '@')
                            // Descendant of a node with changed uriPathSegment
                            .replace(oldUriFragment + '/', newUriFragment + '/');
                    node.uri = newNodeUri;
                }
            });
            break;
        }
        case actionTypes.SET_INLINE_VALIDATION_ERRORS: {
            const {node, propertyName, errors} = action.payload;
            if (errors) {
                draft.inlineValidationErrors[`${node} ${propertyName}`] = errors;
            } else {
                delete draft.inlineValidationErrors[`${node} ${propertyName}`];
            }
            break;
        }
    }
});

//
// Export the selectors
//
export {selectors};
