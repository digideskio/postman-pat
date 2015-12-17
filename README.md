# postman-pat
Runs multiple postman collections in sequence, multiple times, using a given environment. Discovers test data by naming convention.

## Examples
Find all the collections matching the glob `Tests-*.postman_collection` in the current directory, and use the environment in `environments/

```
$> pat -e environments/local.postman_environment -d data-mock/ Tests-*.postman_collection -r 100
Pat: the newman runner /////////
Collection: Tests-Foo.json.postman_collection
Collection: Tests-Bar.json.postman_collection
Collection: Tests-Baz.json.postman_collection
Total: 3 file(s)
Environment: environments/local.postman_environment
Data path: data-mock/
Found data for Tests-Foo at: data-mock/Tests-Foo.data.json
Found data for Tests-Bar at: data-mock/Tests-Bar.data.json
Found data for Tests-Baz at: data-mock/Tests-Baz.data.json

Queueing 3 newman task(s)...
Running Tests-Foo tests...
```
