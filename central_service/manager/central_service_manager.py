import logging
from fokia.vm_manager import VM_Manager
from fokia.ansible_manager_minimal import Manager
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

check_folders = ['/var/www/okeanos-LoD/central_service/ansible',
                 'okeanos-LoD/central_service/ansible',
                 'central_service/ansible',
                 '../central_service/ansible',
                 '../../central_service/ansible']

ansible_path = os.environ.get('CENTRAL_ANSIBLE_PATH', None)
if not ansible_path:
    for folder in check_folders:
        if os.path.exists(folder):
            ansible_path = folder
            break


class CentralServiceManager(object):
    """
    Class deploying the central service VM dynamically.
    It uses the kamaki API to create/destroy the actual VM, running on
    the ~okeanos infrastructure. It uses ansible to install and configure
    the required packages and services.
    """

    def __init__(self, auth_token):
        self.auth_token = auth_token

    def central_service_create(self, vcpus=4, ram=4096, disk=40,
                               project_name='lambda.grnet.gr',
                               private_key_path=None, public_key_path=None):
        """
        Creates the central service vm and installs the relevant s/w.
        :return: ansible result
        """

        provisioner = VM_Manager(auth_token=self.auth_token)
        vm_name = 'central_service'
        vm_id = provisioner.create_single_vm(vm_name=vm_name,
                                             vcpus=vcpus, ram=ram, disk=disk,
                                             project_name=project_name,
                                             public_key_path=public_key_path)
        hostname = 'snf-' + str(vm_id) + '.vm.okeanos.grnet.gr'
        group = 'central-vm'
        ansible_manager = Manager(hostname, group, private_key_path)
        ansible_result = ansible_manager.run_playbook(
            playbook_file=os.path.join(ansible_path, 'playbooks', 'setup.yml'))
        return ansible_result

    def central_service_destroy(self, vm_id):
        """
        Deletes the central service vm.
        :return:
        """

        vmmanager = VM_Manager(auth_token=self.auth_token)
        vmmanager.destroy(vm_id=vm_id)

    def central_service_start(self, vm_id):
        """
        Starts the central service vm if it's not running.
        :return:
        """

        vmmanager = VM_Manager(auth_token=self.auth_token)
        vmmanager.start(vm_id=vm_id)

    def central_service_stop(self, vm_id):
        """
        Stops the central service vm if it's running.
        :return:
        """

        vmmanager = VM_Manager(auth_token=self.auth_token)
        vmmanager.stop(vm_id=vm_id)
