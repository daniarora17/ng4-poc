import tbaas
import time
import json
from sessions.linux import Linux
import requests
from subprocess import call
import os
import zipfile
import urllib
import sys
import shlex

class Firefly_instance():
    def __init__(self):
        """
         Create the testbed on the server.
        :param dict config: TBaaS testbed template
        """
        pass

    def _copy_file(self):
        appUrl = []
        try:
            headers = {'content-type' : 'application/octet-stream'}
            urllib.urlretrieve("http://package.adtran.com:8081/nexus/content/repositories/adtran-release/com/adtran/apps/cptmex-mock-uiservices/0.2.132/cptmex-mock-uiservices-0.2.132.tgz", filename="cptmex-mock-uiservices-0.2.132.tgz")

            filename1 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build/stage/cloud-platform-edit-ui.tgz')
            filename2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cptmex-mock-uiservices-0.2.132.tgz')

            filename = [filename1, filename2]
            for i in filename:
                files = {'file': open(i, 'rb')}
                #Copy applications tgz file to ADTRAN local file system
                response = requests.post('http://fileshare.test.adtran.com/api/files', files=files)
                app_url= response.json()['uri']
                appUrl.append(app_url)
            return appUrl
        except Exception as e:
            print ("Error description : %s", e)
            sys.exit(1)

    def _create_tbaas_instance(self):
        TBAAS_USER = 'jenkins'
        TBAAS_PASSWORD = 'jenkins'
        container_name = 'firefly-container'
        appUrl = self._copy_file()
        num_of_session = 1
        TBAAS_CONFIG = {
            "resources": {
                "firefly-server-{}".format(i): {
                    "type": "FIREFLY",
                    "properties": {
                        "database": "cassandra",
                        "auth_nb": True,
                        "auth_sb": False,
                        "version": "latest",
                        "kafka": True,
                        "cors_enabled": True,
                        "core": True,
                        "kafka": True,
                        "preinstalled_apps": appUrl
                    }
                }for i in range(num_of_session)
            },
            "heat_template_version": "2013-05-23"
        }

        self.attributes = {}
        self.tbaas = tbaas.TestBed(TBAAS_CONFIG,
                                   tbaas_user=TBAAS_USER,
                                   tbaas_password=TBAAS_PASSWORD)
        self.tbaas.start()
        print 'Your TBaaS testbed id is {}'.format(self.tbaas.id)

        # Output information from the testbed
        self.attributes = self.tbaas.attributes

        self.ip_list = []
        for i in range(num_of_session):
            device_name  = "firefly-server-{}".format(i)
            self.ip_list.append(self.attributes[device_name]['ff_ip'])
        print "IP Address of firefly instance is : {}\n".format(self.ip_list[0])
        return self.ip_list

    def run_test(self):
        print "Start : Smoke Test"
        ip_address = self._create_tbaas_instance()
        port = "8080"
        assert ip_address, "IP Address is none"
        print "sleep for 5 minutes."
        sys.stdout.flush()
        time.sleep(120)
        print "run Chrome e2e."
        sys.stdout.flush()
        self.xvfb_grunt_task("e2e:dist::{}:{}:chrome".format(ip_address[0],port))
        # print "run firefox e2e."
        # self.xvfb_grunt_task("e2e:dist::{}:{}:firefox".format(ip_address[0],port))
        # with open ("./reports/e2e/exitCode-firefox.txt", "r") as firefoxfile:
        #     data_firefox=firefoxfile.read().replace('\n', '')
        with open ("./reports/e2e/exitCode-chrome.txt", "r") as chromefile:
            data_chrome = chromefile.read().replace('\n', '')
        assert data_chrome != str(1), "E2E test case execution got Failed"
        print "Reports got archived"
        print "End : Smoke Test"

    def xvfb_grunt_task(self, task):
        cmd = '''xvfb-run --server-args "-screen 0, 1366x768x24" -a grunt {}'''.format(task)
        call(shlex.split(cmd))

    def grunt_task(self, task):
        cmd = ["grunt",
               "{}".format(task)]
        call (cmd)

    def teardown(self):
        """Destroy the testbed."""
        if self.tbaas:
            self.tbaas.stop()

    def __del__(self):
        """A last resort attempt to destroy the testbed."""
        try:
            self.teardown()
        except tbaas.TBaaSError:
            pass

if __name__ == "__main__":
    ff_instance = Firefly_instance()
    ff_instance.run_test()
    print "Automation testing Completed"
