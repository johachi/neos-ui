import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import mergeClassNames from 'classnames';
import debounce from 'lodash.debounce';
import animate from 'amator';

import {getGuestFrameBody, findNodeInGuestFrame} from '@neos-project/neos-ui-guest-frame/src/dom';

import {
    AddNode,
    CopySelectedNode,
    CutSelectedNode,
    DeleteSelectedNode,
    HideSelectedNode,
    PasteClipBoardNode
} from './Buttons/index';
import style from './style.css';

export const position = nodeElement => {
    if (nodeElement && nodeElement.getBoundingClientRect) {
        const bodyBounds = getGuestFrameBody().getBoundingClientRect();
        const domBounds = nodeElement.getBoundingClientRect();

        return {
            top: domBounds.top - bodyBounds.top,
            right: bodyBounds.right - domBounds.right,
            bottom: bodyBounds.bottom - domBounds.bottom
        };
    }

    return {top: 0, right: 0, bottom: 0};
};

export default class NodeToolbar extends PureComponent {
    static propTypes = {
        contextPath: PropTypes.string,
        fusionPath: PropTypes.string,
        destructiveOperationsAreDisabled: PropTypes.bool.isRequired,
        // Flag triggered by content tree that tells inlineUI that it should scroll into view
        shouldScrollIntoView: PropTypes.bool.isRequired,
        // Unsets the flag
        requestScrollIntoView: PropTypes.func.isRequired
    };

    state = {
        isSticky: false
    };

    constructor() {
        super();
        this.iframeWindow = document.getElementsByName('neos-content-main')[0].contentWindow;
    }

    updateStickyness = () => {
        const nodeElement = findNodeInGuestFrame(this.props.contextPath, this.props.fusionPath);
        if (nodeElement) {
            const {isSticky} = this.state;
            const {top, bottom} = nodeElement.getBoundingClientRect();
            const shouldBeSticky = top < 50 && bottom > 0;

            if (isSticky !== shouldBeSticky) {
                this.setState({isSticky: shouldBeSticky});
            }
        }
    };

    componentDidMount() {
        this.iframeWindow.addEventListener('resize', debounce(() => this.forceUpdate(), 20));
        this.iframeWindow.addEventListener('scroll', debounce(this.updateStickyness, 5));
    }

    componentDidUpdate() {
        // Only scroll into view when triggered from content tree (on focus change)
        if (this.props.shouldScrollIntoView) {
            this.scrollIntoView();
            this.props.requestScrollIntoView(false);
        }

        this.updateStickyness();
    }

    scrollIntoView() {
        const iframeDocument = this.iframeWindow.document;
        // See: https://gist.github.com/dperini/ac3d921d6a08f10fd10e
        const scrollingElement = iframeDocument.compatMode.indexOf('CSS1') === 0 && iframeDocument.documentElement.scrollHeight > iframeDocument.body.scrollHeight ? iframeDocument.documentElement : iframeDocument.body;
        const nodeElement = findNodeInGuestFrame(this.props.contextPath, this.props.fusionPath);
        if (nodeElement) {
            const nodeAbsolutePosition = position(nodeElement);
            const nodeRelativePosition = nodeElement.getBoundingClientRect();
            const offset = 100;
            const elementIsNotInView = nodeRelativePosition.top < offset || nodeRelativePosition.bottom + offset > this.iframeWindow.innerHeight;
            if (elementIsNotInView) {
                const scrollTop = nodeAbsolutePosition.top - offset;
                animate(scrollingElement, {scrollTop});
            }
        }
    }

    render() {
        const {contextPath, fusionPath, destructiveOperationsAreDisabled} = this.props;

        if (!contextPath) {
            return null;
        }

        const props = {
            contextPath,
            fusionPath,
            destructiveOperationsAreDisabled,
            className: style.toolBar__btnGroup__btn
        };

        const nodeElement = findNodeInGuestFrame(contextPath, fusionPath);
        const {top, right} = position(nodeElement);

        const {isSticky} = this.state;
        const classNames = mergeClassNames({
            [style.toolBar]: true,
            [style['toolBar--isSticky']]: isSticky
        });

        return (
            <div className={classNames} style={{top: top - 50, right}}>
                <div className={style.toolBar__btnGroup}>
                    <AddNode {...props}/>
                    <HideSelectedNode {...props}/>
                    <CopySelectedNode {...props}/>
                    <CutSelectedNode {...props}/>
                    <PasteClipBoardNode {...props}/>
                    <DeleteSelectedNode {...props}/>
                </div>
            </div>
        );
    }
}
