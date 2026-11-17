# {{ data.recap.user.name }}, this was your {{ data.recap.label }} on {{ data.forge }}

You opened **{{ data.recap.metrics.openedPullRequests }} pull requests** and merged **{{ data.recap.metrics.mergedPullRequests }} pull requests**.

You also opened **{{ data.recap.metrics.openedIssues }} issues** and closed **{{ data.recap.metrics.closedIssues }}**.

Your busiest day was **{{ data.recap.busiestDay.label }}**, with {{ data.recap.busiestDay.count }} recorded actions. Your busiest hour was **{{ data.recap.busiestHour.label }}**.

::if{:condition="data.recap.topRepository"}
You were most active in **{{ data.recap.topRepository.name }}**, with {{ data.recap.topRepository.count }} recorded actions.
::

[Open and share your visual recap](){:href="data.url"}
