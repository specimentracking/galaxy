Specimen Tracking Quickstart
============================
This fork contains modified Galaxy release branch `specimen_tracking_15.10` that introduces backend, frontend and API changes allowing integration of specimen tracking functionality.

related resources:

* Trello development board https://trello.com/b/hllw7G7C/development
* API documentation http://docs.galaxysampletracking.apiary.io/
* presentation of this project @GCC2014 http://www.slideshare.net/MartinCech1/cechspecimentracking
* mobile app mockups https://moqups.com/martenson/ehuJNy2b/


Galaxy Quickstart
=================

**Visit home Galaxy repository at https://github.com/galaxyproject/galaxy**

Galaxy requires Python 2.6 or 2.7. To check your python version, run:

.. code:: console

    $ python -V
    Python 2.7.3

Start Galaxy:

.. code:: console

    $ sh run.sh

Once Galaxy completes startup, you should be able to view Galaxy in your
browser at:

http://localhost:8080

You may wish to make changes from the default configuration. This can be
done in the ``config/galaxy.ini`` file. Tools can be either installed
from the Tool Shed or added manually. For details please see the Galaxy
wiki:

https://wiki.galaxyproject.org/Admin/Tools/AddToolFromToolShedTutorial

Not all dependencies are included for the tools provided in the sample
``tool_conf.xml``. A full list of external dependencies is available at:

https://wiki.galaxyproject.org/Admin/Tools/ToolDependencies

Issues and Galaxy Development
=============================

Please see `CONTRIBUTING.md <CONTRIBUTING.md>`_ .
