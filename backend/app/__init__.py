"""MuleTrace application package."""
"""MuleTrace application package.

The merged backend has a few legacy absolute imports using ``app``. Register
this package alias so ``backend.app.main`` works from the repository root too.
"""

import sys

sys.modules.setdefault("app", sys.modules[__name__])
