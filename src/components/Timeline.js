import React from 'react'
import Engine from 'engine-fork'
import invariant from 'invariant'

import { appendLifecycleHooks } from '../utils/lifecycle'
import { noop } from '../utils/noop'
import { getPropsFromMain } from '../utils/getProps'

export class Timeline {
  constructor(attributes) {
    this.attributes = attributes || {}

    // We use .play() to start the animation, so disable autoplay.
    if (!this.attributes.autoplay) {
      this.attributes.autoplay = false
    }

    this.inst = Engine.timeline({ ...this.attributes })
  }

  createTimelineSyncComp = () => {
    const main = this.inst

    const props = getPropsFromMain(main)

    // This components represents the current timeline of an animation.
    // It is used to control the animation (play, pause, reverse, restart).
    // We can also manage the animation lifecycle using this component.
    class TimelineSync extends React.Component {
      static defaultProps = {
        // These values are also available via the main animation engine instance.
        play: false,
        pause: false,
        restart: false,
        reverse: false,

        seek: ctrl => ctrl.default(noop),

        lifecycle: {
          update: noop,
          start: noop,
          complete: noop,
          frame: noop,
        },
      }

      componentDidMount = () => {
        if (this.props.lifecycle) {
          appendLifecycleHooks(main, this.props.lifecycle)
        }
      }

      componentDidUpdate = () => {
        if (this.props.play) main.play()

        if (this.props.pause) main.pause()

        if (this.props.restart) main.restart()

        if (this.props.reverse) main.reverse()

        if (this.props.seek) {
          const config = {
            // By default we sync the animation progress value with the user defined value.
            default: value => main.seek(main.duration * (value / 100)),
            custom: callback => {
              invariant(
                typeof callback === 'function',
                `Expected callback to be a function instead got a ${typeof callback}.`
              )
              // Also pass the animation engine instance to the user defined callback
              main.seek(callback(props))
            },
          }

          // Invoke the seek callback.
          this.props.seek(config)
        }
      }

      render = () => {
        // TimelineSync component can be present anywhere in the tree, so either render nothing or wrap the childrens.
        return this.props.children || null
      }
    }

    return TimelineSync
  }

  init = () => {
    this.inst['values'] = this.inst['add']

    return {
      // Animate is the main object which will collect values for animating the nodes
      // Properties supported on Animate - (play, pause, restart, reverse)
      Animate: this.inst,
      // React component that represents the animation timeline
      Timeline: this.createTimelineSyncComp(),
    }
  }
}
