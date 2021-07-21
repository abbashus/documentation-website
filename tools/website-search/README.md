This project is set up like a standard Python project.  The initialization
process also creates a virtualenv within this project, stored under the `.venv`
directory.  To create the virtualenv it assumes that there is a `python3`
(or `python` for Windows) executable in your path with access to the `venv`
package. If for any reason the automatic creation of the virtualenv fails,
you can create the virtualenv manually.


To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .search-venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .search-venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .search-venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

The script indexes the documents listed under directories in this repository to OpenSearch cluster.