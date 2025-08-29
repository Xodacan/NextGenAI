import requests
import json
from typing import Dict, List, Optional
from .config import SIMPLE_APP_SERVER_CONFIG, ALIBABA_CLOUD_CONFIG


class AlibabaSimpleAppServerService:
    """Alibaba Cloud Simple Application Server service for deployment management"""
    
    def __init__(self):
        self.access_key_id = ALIBABA_CLOUD_CONFIG['ACCESS_KEY_ID']
        self.access_key_secret = ALIBABA_CLOUD_CONFIG['ACCESS_KEY_SECRET']
        self.instance_id = SIMPLE_APP_SERVER_CONFIG['INSTANCE_ID']
        self.region_id = SIMPLE_APP_SERVER_CONFIG['REGION_ID']
        self.deployment_path = SIMPLE_APP_SERVER_CONFIG['DEPLOYMENT_PATH']
    
    def deploy_application(self, deployment_config: Dict) -> Dict:
        """
        Deploy the NextGenAI application to Simple Application Server
        
        Args:
            deployment_config: Deployment configuration including git repo, branch, etc.
            
        Returns:
            Dict containing deployment status
        """
        try:
            payload = {
                "instance_id": self.instance_id,
                "deployment_path": self.deployment_path,
                "git_repository": deployment_config.get('git_repository', ''),
                "branch": deployment_config.get('branch', 'main'),
                "build_commands": deployment_config.get('build_commands', []),
                "environment_variables": deployment_config.get('environment_variables', {}),
                "restart_services": deployment_config.get('restart_services', True)
            }
            
            response = requests.post(
                f"https://swas.cn-{self.region_id}.aliyuncs.com/v1/deployments",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Region-Id': self.region_id
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'deployment_id': result.get('deployment_id', ''),
                    'status': result.get('status', ''),
                    'estimated_completion': result.get('estimated_completion', ''),
                    'deployment_url': result.get('deployment_url', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Deployment error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Deployment error: {str(e)}'
            }
    
    def get_deployment_status(self, deployment_id: str) -> Dict:
        """
        Check the status of a deployment
        
        Args:
            deployment_id: Deployment identifier
            
        Returns:
            Dict containing deployment status
        """
        try:
            response = requests.get(
                f"https://swas.cn-{self.region_id}.aliyuncs.com/v1/deployments/{deployment_id}",
                headers={
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Region-Id': self.region_id
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'status': result.get('status', ''),
                    'progress': result.get('progress', 0),
                    'logs': result.get('logs', []),
                    'deployment_url': result.get('deployment_url', ''),
                    'completion_time': result.get('completion_time', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Status check error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Status check error: {str(e)}'
            }
    
    def restart_application(self) -> Dict:
        """
        Restart the deployed application
        
        Returns:
            Dict containing restart status
        """
        try:
            payload = {
                "instance_id": self.instance_id,
                "application_path": self.deployment_path,
                "restart_type": "full"
            }
            
            response = requests.post(
                f"https://swas.cn-{self.region_id}.aliyuncs.com/v1/applications/restart",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Region-Id': self.region_id
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'restart_id': result.get('restart_id', ''),
                    'status': result.get('status', ''),
                    'estimated_completion': result.get('estimated_completion', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Restart error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Restart error: {str(e)}'
            }
    
    def get_application_logs(self, log_type: str = 'application', lines: int = 100) -> Dict:
        """
        Get application logs from the server
        
        Args:
            log_type: Type of logs (application, error, access)
            lines: Number of lines to retrieve
            
        Returns:
            Dict containing log data
        """
        try:
            payload = {
                "instance_id": self.instance_id,
                "log_type": log_type,
                "lines": lines,
                "application_path": self.deployment_path
            }
            
            response = requests.post(
                f"https://swas.cn-{self.region_id}.aliyuncs.com/v1/logs/retrieve",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Region-Id': self.region_id
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'logs': result.get('logs', []),
                    'log_file': result.get('log_file', ''),
                    'total_lines': result.get('total_lines', 0)
                }
            else:
                return {
                    'success': False,
                    'error': f'Log retrieval error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Log retrieval error: {str(e)}'
            }
    
    def update_environment_variables(self, env_vars: Dict) -> Dict:
        """
        Update environment variables for the application
        
        Args:
            env_vars: Dictionary of environment variables
            
        Returns:
            Dict containing update status
        """
        try:
            payload = {
                "instance_id": self.instance_id,
                "application_path": self.deployment_path,
                "environment_variables": env_vars,
                "restart_required": True
            }
            
            response = requests.post(
                f"https://swas.cn-{self.region_id}.aliyuncs.com/v1/applications/environment",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Region-Id': self.region_id
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'update_id': result.get('update_id', ''),
                    'status': result.get('status', ''),
                    'restart_triggered': result.get('restart_triggered', False)
                }
            else:
                return {
                    'success': False,
                    'error': f'Environment update error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Environment update error: {str(e)}'
            }
    
    def get_server_status(self) -> Dict:
        """
        Get the current status of the Simple Application Server instance
        
        Returns:
            Dict containing server status information
        """
        try:
            response = requests.get(
                f"https://swas.cn-{self.region_id}.aliyuncs.com/v1/instances/{self.instance_id}",
                headers={
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Region-Id': self.region_id
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'instance_status': result.get('status', ''),
                    'public_ip': result.get('public_ip', ''),
                    'cpu_usage': result.get('cpu_usage', 0),
                    'memory_usage': result.get('memory_usage', 0),
                    'disk_usage': result.get('disk_usage', 0),
                    'uptime': result.get('uptime', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Server status error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Server status error: {str(e)}'
            }
