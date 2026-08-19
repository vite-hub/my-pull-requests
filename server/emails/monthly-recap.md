# {{ recap.user.name }}, this was your {{ recap.label }} on GitHub

You opened **{{ recap.metrics.openedPullRequests }} pull requests** and merged **{{ recap.metrics.mergedPullRequests }} pull requests**.

You also opened **{{ recap.metrics.openedIssues }} issues** and closed **{{ recap.metrics.closedIssues }}**.

Your busiest day was **{{ recap.busiestDay.label }}**, with {{ recap.busiestDay.count }} recorded actions. Your busiest hour was **{{ recap.busiestHour.label }}**.

::if{recap.topRepository}
You were most active in **{{ recap.topRepository.name }}**, with {{ recap.topRepository.count }} recorded actions.
::

[Open and share your visual recap]({{ url }})
