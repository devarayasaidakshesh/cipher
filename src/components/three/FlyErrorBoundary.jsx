import { Component } from "react"

// Catches useTexture / CORS failures during the fly-to-cart flight. On error,
// skip the flight and call onComplete immediately so the item is still added to
// the cart + the cart opens (Suspense handles loading, not errors — so this
// boundary is the failure path).
export default class FlyErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch() {
    const { onComplete, item } = this.props
    if (onComplete) onComplete(item)
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
