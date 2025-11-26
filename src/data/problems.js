export const problems = [
  {
    id: 'ansible-auth',
    title: 'Ansible-Based Deployment Automation',
    description: 'Deploy Node.js app with K8s, ConfigMap, and Secret using Ansible.',
    statement: `You have a Node.js app auth-service listening on port 4000.
Requirements:
1. Write a Dockerfile to containerize the app.
2. Create Ansible playbook deploy_auth.yml that:
   - Creates namespace auth-ns
   - Deploys the app using a Deployment manifest
   - Creates a ConfigMap with env values (LOG_LEVEL, MODE)
   - Creates a Secret (AUTH_KEY)
   - Applies a Service (type ClusterIP)
   - Playbook should support update mode—if image tag changes, only rollout Deployment.`,
    solution: {
      'Dockerfile': `FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]`,
      'deploy_auth.yml': `---
- name: Deploy Auth Service to Kubernetes
  hosts: localhost
  connection: local
  vars:
    image_name: "auth-service"
    image_tag: "latest"
  tasks:
    - name: Create namespace auth-ns
      k8s:
        name: auth-ns
        api_version: v1
        kind: Namespace
        state: present
    - name: Create ConfigMap
      k8s:
        state: present
        definition: "{{ lookup('template', 'templates/configmap.yml.j2') }}"
    - name: Create Secret
      k8s:
        state: present
        definition: "{{ lookup('template', 'templates/secret.yml.j2') }}"
    - name: Deploy App
      k8s:
        state: present
        definition: "{{ lookup('template', 'templates/deployment.yml.j2') }}"
    - name: Create Service
      k8s:
        state: present
        definition: "{{ lookup('template', 'templates/service.yml.j2') }}"`
    },
    explanation: 'This solution uses Ansible to orchestrate Kubernetes resources. It defines templates for Deployment, Service, ConfigMap, and Secret, and applies them using the `k8s` Ansible module. The Dockerfile containerizes the Node.js application.',
    howToRun: `1. Navigate to the \`auth-service\` directory and build the Docker image:
   \`\`\`bash
   docker build -t auth-service:latest .
   \`\`\`
2. Navigate to the \`ansible\` directory and run the playbook:
   \`\`\`bash
   ansible-playbook deploy_auth.yml
   \`\`\``
  },
  {
    id: 'terraform-nginx',
    title: 'Terraform + Kubernetes Provider + Application Deployment',
    description: 'Use Terraform to start Minikube and deploy Nginx with NodePort.',
    statement: `Use Terraform to:
1. Start a minikube cluster (local_exec).
2. Use the Kubernetes provider to create:
   - Namespace tf-app
   - Deployment (nginx) with 2 replicas
   - Service NodePort exposing port 80
3. After terraform apply, the nginx service must be accessible.`,
    solution: {
      'main.tf': `terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "minikube"
}
resource "null_resource" "minikube_start" {
  provisioner "local-exec" {
    command = "minikube start"
  }
}`,
      'kubernetes.tf': `resource "kubernetes_namespace" "tf_app" {
  metadata {
    name = "tf-app"
  }
  depends_on = [null_resource.minikube_start]
}
resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx-deployment"
    namespace = kubernetes_namespace.tf_app.metadata[0].name
    labels = { app = "nginx" }
  }
  spec {
    replicas = 2
    selector { match_labels = { app = "nginx" } }
    template {
      metadata { labels = { app = "nginx" } }
      spec {
        container {
          image = "nginx:latest"
          name  = "nginx"
          port { container_port = 80 }
        }
      }
    }
  }
}
resource "kubernetes_service" "nginx" {
  metadata {
    name      = "nginx-service"
    namespace = kubernetes_namespace.tf_app.metadata[0].name
  }
  spec {
    selector = { app = "nginx" }
    port { port = 80; target_port = 80 }
    type = "NodePort"
  }
}`
    },
    explanation: 'This solution uses Terraform to manage the infrastructure. It uses a `null_resource` with `local-exec` to ensure Minikube is running, and then uses the `kubernetes` provider to define the Namespace, Deployment, and Service resources.',
    howToRun: `1. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`
2. Apply the configuration:
   \`\`\`bash
   terraform apply
   \`\`\``
  },
  {
    id: 'blue-green-go',
    title: 'Blue-Green Deployment Flow Using Ansible',
    description: 'Deploy Go service with Blue-Green strategy using Ansible.',
    statement: `Deploy a Go service named user-api.
Tasks:
1. Create Docker images user-api-blue:v1 and user-api-green:v1.
2. Blue is initially active.
3. Ansible playbook must:
   - Deploy both blue & green deployments
   - Switch traffic by modifying the Service selector
   - Test by curling the active version.`,
    solution: {
      'blue_green_deploy.yml': `---
- name: Blue-Green Deployment
  hosts: localhost
  connection: local
  tasks:
    - name: Build Images
      command: docker build -t user-api-{{ item }}:v1 ../user-api --build-arg COLOR={{ item }}
      loop: [blue, green]
    - name: Deploy Blue
      k8s:
        definition: "{{ lookup('template', 'templates/deployment.yml.j2') }}"
      vars: { color: "blue" }
    - name: Deploy Green
      k8s:
        definition: "{{ lookup('template', 'templates/deployment.yml.j2') }}"
      vars: { color: "green" }
    - name: Point Service to Blue
      k8s:
        definition: "{{ lookup('template', 'templates/service.yml.j2') }}"
      vars: { active_color: "blue" }
    - name: Verify Blue
      uri: { url: "http://localhost:8080", return_content: yes }
    - name: Switch to Green
      k8s:
        definition: "{{ lookup('template', 'templates/service.yml.j2') }}"
      vars: { active_color: "green" }`
    },
    explanation: 'This solution implements Blue-Green deployment by maintaining two parallel deployments (Blue and Green) and switching the Service selector to point to the desired version. Ansible automates the build, deployment, and traffic switching process.',
    howToRun: `1. Navigate to the \`ansible\` directory:
   \`\`\`bash
   cd ansible
   \`\`\`
2. Run the playbook:
   \`\`\`bash
   ansible-playbook blue_green_deploy.yml
   \`\`\``
  },
  {
    id: 'k8s-network-policy',
    title: 'Kubernetes NetworkPolicy + Multi-Tier App',
    description: '3-tier app with strict NetworkPolicies.',
    statement: `A 3-tier app: frontend (NGINX), backend (Flask), db (Postgres).
Tasks:
1. Deploy all three components with correct labels.
2. Create NetworkPolicies:
   - Only frontend → backend allowed
   - Only backend → postgres allowed
   - All other traffic denied
3. Store Postgres credentials in Secrets.
4. Attach PVC to Postgres.`,
    solution: {
      'network-policies.yaml': `# Deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-all }
spec:
  podSelector: {}
  policyTypes: [Ingress]
---
# Allow Frontend -> Backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-frontend-backend }
spec:
  podSelector: { matchLabels: { tier: backend } }
  ingress: [{ from: [{ podSelector: { matchLabels: { tier: frontend } } }] }]
---
# Allow Backend -> DB
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-backend-db }
spec:
  podSelector: { matchLabels: { tier: db } }
  ingress: [{ from: [{ podSelector: { matchLabels: { tier: backend } } }] }]`
    },
    explanation: 'This solution secures the 3-tier application using Kubernetes NetworkPolicies. A "default deny" policy ensures no unauthorized traffic is allowed. Specific policies then open up the necessary paths: Frontend to Backend, and Backend to Database.',
    howToRun: `1. Build the backend Docker image:
   \`\`\`bash
   cd backend
   docker build -t backend:latest .
   \`\`\`
2. Apply the Kubernetes manifests:
   \`\`\`bash
   kubectl apply -f postgres.yaml
   kubectl apply -f backend.yaml
   kubectl apply -f frontend.yaml
   kubectl apply -f network-policies.yaml
   \`\`\``
  },
  {
    id: 'aws-ecr-terraform',
    title: 'AWS ECR & Terraform Challenge',
    description: 'Automate Docker build/push and EC2 deployment using Terraform.',
    statement: `Objective:
Dockerize a Python application, provision an AWS ECR repository, IAM resources, and an EC2 instance using Terraform.

The Terraform configuration should AUTOMATICALLY build/push the image and configure the EC2 instance to run it.

Tasks:
1. Application Setup: Review app.py and Dockerfile.
2. Infrastructure as Code (Terraform):
   - Provision ECR, IAM User, Policies, and EC2 Instance.
   - Automation 1: Use local-exec to login, build, and push Docker image to ECR.
   - Automation 2: Configure EC2 user_data to install Docker, login to ECR, and run the image.`,
    solution: {
      'main.tf': `provider "aws" {
  region = var.aws_region
}

# 1. Create ECR Repository
resource "aws_ecr_repository" "app_repo" {
  name                 = var.repo_name
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

# ... (IAM User, Policy, Attachment omitted for brevity) ...

# 7. Build and Push Docker Image (Local Exec)
resource "null_resource" "docker_build_push" {
  triggers = {
    always_run = "\${timestamp()}"
  }

  provisioner "local-exec" {
    command = <<EOF
      aws ecr get-login-password --region \${var.aws_region} | docker login --username AWS --password-stdin \${aws_ecr_repository.app_repo.repository_url}
      docker build -t \${aws_ecr_repository.app_repo.repository_url}:latest .
      docker push \${aws_ecr_repository.app_repo.repository_url}:latest
    EOF
  }
}

# EC2 Instance
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t2.micro"
  
  # ... (Security Group, IAM Profile) ...

  depends_on = [null_resource.docker_build_push]

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y docker
              service docker start
              usermod -a -G docker ec2-user

              # Login to ECR
              aws ecr get-login-password --region \${var.aws_region} | docker login --username AWS --password-stdin \${aws_ecr_repository.app_repo.repository_url}

              # Pull and Run
              docker pull \${aws_ecr_repository.app_repo.repository_url}:latest
              docker run -d -p 5000:5000 \${aws_ecr_repository.app_repo.repository_url}:latest
              EOF
}`
    },
    explanation: 'This solution uses Terraform to automate the entire lifecycle. It uses `local-exec` to build and push the Docker image to ECR from the machine running Terraform. Then, it uses `user_data` on the EC2 instance to install Docker, authenticate with ECR using an Instance Profile, and run the application container on startup.',
    howToRun: `1. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`
2. Apply the configuration:
   \`\`\`bash
   terraform apply
   \`\`\`
3. Verify:
   - Wait for the EC2 instance to initialize.
   - Access the app at \`http://<instance_public_ip>:5000\`.`
  },
  {
    id: 'k8s-pod-security',
    title: 'Implementing Pod Security Contexts',
    description: 'Configure strict and baseline Pod Security Standards.',
    statement: `1. Create two Kubernetes namespaces: "flaskapp-dev" (baseline) and "flaskapp-prod" (strict).
2. Create "flaskapp-deployment-dev" in "flaskapp-dev":
    - Run as non-root user.
    - Drop all capabilities except CHOWN, SETUID, SETGID.
    - Allow privilege escalations.
3. Create "flaskapp-deployment-prod" in "flaskapp-prod":
    - Run as non-root user.
    - Drop ALL capabilities.
    - Read-only root filesystem.
    - Restrict privilege escalations.`,
    solution: {
      'namespaces.yml': `apiVersion: v1
kind: Namespace
metadata:
  name: flaskapp-dev
  labels:
    pod-security.kubernetes.io/enforce: baseline
---
apiVersion: v1
kind: Namespace
metadata:
  name: flaskapp-prod
  labels:
    pod-security.kubernetes.io/enforce: strict`,
      'flaskapp-deployment-prod.yml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: flaskapp-deployment-prod
  namespace: flaskapp-prod
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: flaskapp-container
        image: flask-app-image
        securityContext:
          runAsUser: 10000
          runAsGroup: 10000
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false`
    },
    explanation: "This solution demonstrates how to enforce Pod Security Standards at the Namespace level using labels and how to configure Pods and Containers to meet those standards. The 'dev' environment uses the 'baseline' policy, while 'prod' uses 'strict', requiring more restrictive security contexts like dropping capabilities and running as non-root.",
    howToRun: `1. Run the setup script to start Minikube:
   \`\`\`bash
   ./setup.sh
   \`\`\`
2. Apply the manifests:
   \`\`\`bash
   kubectl apply -f namespaces.yml
   kubectl apply -f flaskapp-deployment-dev.yml
   kubectl apply -f flaskapp-service-dev.yml
   kubectl apply -f flaskapp-deployment-prod.yml
   kubectl apply -f flaskapp-service-prod.yml
   \`\`\``
  },
  {
    id: 'secure-docker-readonly',
    title: 'Secure Dockerfile + Read-Only Root Filesystem',
    description: 'Containerize a Python script with strict security controls.',
    statement: `Containerize a Python script processor.py.

Requirements:
1. Create non-root user processor.
2. Create Dockerfile that:
   - Runs as non-root
   - Sets root filesystem to read-only (via runtime config supported by image design)
   - Drops ALL Linux capabilities (via runtime config)
3. Test that script still runs (write output to mounted /data volume).`,
    solution: {
      'processor.py': `import os
import time

output_file = "/data/output.txt"

print("Starting processor...")
try:
    # Ensure /data exists (it should be a volume)
    if not os.path.exists("/data"):
        print("Error: /data directory does not exist.")
        exit(1)

    with open(output_file, "w") as f:
        f.write(f"Processed at {time.ctime()}\\n")
    print(f"Successfully wrote to {output_file}")
except Exception as e:
    print(f"Error writing to {output_file}: {e}")
    exit(1)`,
      'Dockerfile': `FROM python:3.9-slim

# Create a non-root user 'processor' with UID 1000
RUN useradd -m -r -u 1000 processor

# Set working directory
WORKDIR /app

# Copy application code
COPY processor.py .

# Create /data directory and set ownership to processor
# This is where we will mount our volume
RUN mkdir /data && chown processor:processor /data

# Switch to non-root user
USER processor

# Command to run the application
CMD ["python", "processor.py"]`
    },
    explanation: 'This solution uses a multi-layered security approach. The Dockerfile creates a dedicated non-root user and ensures the application runs as that user. It prepares a specific directory (/data) for writing output. At runtime, we enforce a read-only root filesystem and drop all Linux capabilities to minimize the attack surface.',
    howToRun: `1. Build the Docker image:
   \`\`\`bash
   docker build -t secure-processor .
   \`\`\`
2. Run the container with security flags:
   \`\`\`bash
   docker run --rm \\
     --read-only \\
     --cap-drop=ALL \\
     --user 1000:1000 \\
     -v $(pwd)/data:/data \\
     secure-processor
   \`\`\`
   Note: Ensure a local \`data\` directory exists or let Docker create it.`
  },
  {
    id: 'terraform-localstack',
    title: 'Terraform + AWS Local Simulation (LocalStack)',
    description: 'Build infrastructure using Terraform pointing to LocalStack.',
    statement: `Build infrastructure using Terraform pointing to LocalStack.

Tasks:
1. Create S3 bucket demo-bucket.
2. Create DynamoDB table users with key id.
3. Create API Gateway REST API → Lambda → DynamoDB.
4. Test locally using curl.

(This helps even if your test won’t use AWS—concepts matter.)`,
    solution: {
      'lambda.py': `import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table_name = os.environ['TABLE_NAME']
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        # Example: Put a user
        user_id = "user_123"
        table.put_item(Item={'id': user_id, 'name': 'Test User'})
        
        return {
            'statusCode': 200,
            'body': json.dumps(f'User {user_id} added to {table_name}')
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }`,
      'main.tf': `provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3             = "http://localhost:4566"
    dynamodb       = "http://localhost:4566"
    lambda         = "http://localhost:4566"
    apigateway     = "http://localhost:4566"
    iam            = "http://localhost:4566"
    sts            = "http://localhost:4566"
  }
}

resource "aws_s3_bucket" "demo_bucket" {
  bucket = "demo-bucket"
}

resource "aws_dynamodb_table" "users" {
  name           = "users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  attribute {
    name = "id"
    type = "S"
  }
}

# ... (Lambda, API Gateway resources omitted for brevity) ...`
    },
    explanation: 'This solution demonstrates how to use Terraform with LocalStack to simulate AWS services locally. It configures the AWS provider to point to localhost endpoints. It creates an S3 bucket, a DynamoDB table, and a serverless stack (API Gateway + Lambda) that interacts with the database.',
    howToRun: `1. Start LocalStack:
   \`\`\`bash
   docker run --rm -it -p 4566:4566 -p 4510-4559:4510-4559 localstack/localstack
   \`\`\`
2. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`
3. Apply the configuration:
   \`\`\`bash
   terraform apply
   \`\`\`
4. Test the API:
   \`\`\`bash
   curl -X POST http://localhost:4566/restapis/<api_id>/test/_user_request_/users
   \`\`\``
  },
  {
    id: 'helm-microservice',
    title: 'Helm Chart Creation for Microservice',
    description: 'Create a Helm chart for a Spring Boot application.',
    statement: `Create a Helm chart structure for a simple Java Spring Boot app.

Requirements:
1. Create a Helm chart structure:
   - values.yaml
   - deployment.yaml
   - service.yaml
   - configmap.yaml
2. Template all variables (replicas, image, port).
3. Deploy via: \`helm install springapp ./springchart\``,
    solution: {
      'Chart.yaml': `apiVersion: v2
name: springchart
description: A Helm chart for a simple Spring Boot application
type: application
version: 0.1.0
appVersion: "1.0.0"`,
      'values.yaml': `replicaCount: 2

image:
  repository: springapp
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

config:
  logLevel: INFO`,
      'templates/deployment.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-deployment
  labels:
    app: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-config`,
      'templates/service.yaml': `apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-service
spec:
  type: {{ .Values.service.type }}
  selector:
    app: {{ .Release.Name }}
  ports:
    - protocol: TCP
      port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}`,
      'templates/configmap.yaml': `apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
data:
  LOG_LEVEL: {{ .Values.config.logLevel | quote }}`
    },
    explanation: 'This solution defines a standard Helm chart structure. The `values.yaml` file acts as the source of truth for configuration. The templates in the `templates/` directory use Go templating syntax (e.g., `{{ .Values.key }}`) to inject these values into the Kubernetes manifests, allowing for flexible and reusable deployments.',
    howToRun: `1. Navigate to the directory containing the chart:
   \`\`\`bash
   cd helm-microservice
   \`\`\`
2. Install the chart:
   \`\`\`bash
   helm install springapp ./springchart
   \`\`\`
3. Verify the release:
   \`\`\`bash
   helm list
   kubectl get all -l app=springapp
   \`\`\``
  },
  {
    id: 'cicd-simulation',
    title: 'CI/CD Simulation Using Bash + Docker + K8s',
    description: 'Simulate a local CI pipeline using Bash scripts.',
    statement: `Simulate a local CI pipeline.

Tasks:
1. Write script build.sh:
   - Lints app
   - Builds Docker image with tag based on timestamp
   - Pushes to local registry
2. Write script deploy.sh:
   - Updates K8s Deployment image
   - Triggers rollout
   - Waits for rollout to complete
3. Works for any application container.`,
    solution: {
      'build.sh': `#!/bin/bash
set -e

APP_NAME=$1
REGISTRY="localhost:5000"

if [ -z "$APP_NAME" ]; then
  echo "Usage: ./build.sh <app-name>"
  exit 1
fi

echo "--- Step 1: Linting ---"
# Mock linting
echo "Linting $APP_NAME..."
sleep 1
echo "Linting passed."

echo "--- Step 2: Building Docker Image ---"
TIMESTAMP=$(date +%s)
IMAGE_TAG="$REGISTRY/$APP_NAME:$TIMESTAMP"

docker build -t $IMAGE_TAG .

echo "--- Step 3: Pushing to Registry ---"
docker push $IMAGE_TAG

echo "Build complete. Image: $IMAGE_TAG"
# Output the tag for the deploy script to use
echo $IMAGE_TAG > image_tag.txt`,
      'deploy.sh': `#!/bin/bash
set -e

DEPLOYMENT_NAME=$1
NAMESPACE="default"

if [ -z "$DEPLOYMENT_NAME" ]; then
  echo "Usage: ./deploy.sh <deployment-name>"
  exit 1
fi

if [ ! -f image_tag.txt ]; then
  echo "Error: image_tag.txt not found. Run build.sh first."
  exit 1
fi

IMAGE_TAG=$(cat image_tag.txt)

echo "--- Step 1: Updating Deployment ---"
echo "Updating $DEPLOYMENT_NAME with image $IMAGE_TAG..."

kubectl set image deployment/$DEPLOYMENT_NAME *= $IMAGE_TAG -n $NAMESPACE

echo "--- Step 2: Triggering Rollout ---"
kubectl rollout restart deployment/$DEPLOYMENT_NAME -n $NAMESPACE

echo "--- Step 3: Waiting for Rollout ---"
kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE

echo "Deployment complete!"`
    },
    explanation: 'This solution simulates a CI/CD pipeline using simple Bash scripts. The `build.sh` script handles the "Continuous Integration" part: linting, building, and pushing the artifact (Docker image). The `deploy.sh` script handles the "Continuous Deployment" part: updating the Kubernetes deployment to use the new image and waiting for the rollout to succeed.',
    howToRun: `1. Ensure you have a local registry running at localhost:5000.
2. Run the build script:
   \`\`\`bash
   ./build.sh my-app
   \`\`\`
3. Run the deploy script:
   \`\`\`bash
   ./deploy.sh my-deployment
   \`\`\``
  },
  {
    id: 'k8s-volume-permissions',
    title: 'Kubernetes Volume Permissions + fsGroup + Security',
    description: 'Configure Pod security context for volume ownership.',
    statement: `A pod needs access to a mounted volume as user id 2000.

Requirements:
1. Create a Pod volume-test with:
   - runAsUser: 2000
   - fsGroup: 2000
   - volume mount /data
2. Use emptyDir volume.
3. Exec into pod and verify ownership of /data.`,
    solution: {
      'pod.yaml': `apiVersion: v1
kind: Pod
metadata:
  name: volume-test
spec:
  securityContext:
    runAsUser: 2000
    fsGroup: 2000
  containers:
  - name: test-container
    image: busybox
    command: ["sh", "-c", "sleep 3600"]
    volumeMounts:
    - name: data-volume
      mountPath: /data
  volumes:
  - name: data-volume
    emptyDir: {}`
    },
    explanation: 'This solution uses the `securityContext` at the Pod level. `runAsUser: 2000` ensures the container process runs as user 2000. `fsGroup: 2000` ensures that any volume mounted to the pod (that supports ownership management, like emptyDir) is owned by group 2000, and the container process is added to that group, allowing read/write access.',
    howToRun: `1. Apply the manifest:
   \`\`\`bash
   kubectl apply -f pod.yaml
   \`\`\`
2. Verify the pod is running:
   \`\`\`bash
   kubectl get pod volume-test
   \`\`\`
3. Verify ownership:
   \`\`\`bash
   kubectl exec volume-test -- ls -ld /data
   # Output should show user/group as 2000
   \`\`\``
  }
];
