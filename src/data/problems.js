export const problems = [
  {
    id: 'ansible-auth',
    title: 'Ansible-Based Deployment Automation',
    description: 'Deploy Node.js app with K8s, ConfigMap, and Secret using Ansible.',
    statement: `# Ansible-Based Deployment Automation (K8s + ConfigMap + Secret)

## Objective
Automate the deployment of a Node.js \`auth-service\` to Kubernetes using Ansible. This includes building the Docker image and running an Ansible playbook to deploy Kubernetes resources.

## Prerequisites
- **Docker**: To build the application image.
- **Kubernetes Cluster**: A running cluster (e.g., Minikube).
- **Ansible**: To run the deployment playbook.
- **Python Kubernetes Module**: Required by Ansible's \`k8s\` module (\`pip install kubernetes\`).

## Project Structure
\`\`\`
minihack-ansible-k8s-auth/
├── auth-service/           # Node.js Application
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
└── ansible/                # Ansible Automation
    ├── deploy_auth.yml     # Main Playbook
    └── templates/          # Kubernetes Manifest Templates
        ├── configmap.yml.j2
        ├── deployment.yml.j2
        ├── secret.yml.j2
        └── service.yml.j2
\`\`\`

## Deployment Steps

### 1. Build the Docker Image
Navigate to the \`auth-service\` directory and build the Docker image.
\`\`\`bash
cd auth-service
docker build -t auth-service:latest .
\`\`\`
> **Note:** If using Minikube, ensure you point your shell to Minikube's Docker daemon: \`eval $(minikube docker-env)\`

### 2. Run the Ansible Playbook
Navigate to the \`ansible\` directory and run the playbook.
\`\`\`bash
cd ../ansible
ansible-playbook deploy_auth.yml
\`\`\`

This playbook must:
1.  Create the \`auth-ns\` namespace.
2.  Create a ConfigMap (\`auth-config\`) with environment variables.
3.  Create a Secret (\`auth-secret\`) with the auth key.
4.  Deploy the \`auth-service\` Deployment.
5.  Create the \`auth-service\` Service (ClusterIP).

### 3. Verify Deployment
Check the status of the resources in the \`auth-ns\` namespace.
\`\`\`bash
kubectl get all -n auth-ns
\`\`\`

To access the service (ClusterIP), use port-forwarding:
\`\`\`bash
kubectl port-forward svc/auth-service 4000:4000 -n auth-ns
\`\`\`
Then access \`http://localhost:4000\`.

## Configuration
Customize the deployment using variables in \`ansible/deploy_auth.yml\`:
- \`image_name\`: Name of the Docker image.
- \`image_tag\`: Tag of the Docker image.
- \`log_level\`: Application log level.
- \`mode\`: Application mode (e.g., production, development).
- \`auth_key\`: Secret key for the application.`,
    solution: {
      'auth-service/package.json': `{
  "name": "auth-service",
  "version": "1.0.0",
  "description": "Auth Service for K8s Deployment",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}`,
      'auth-service/index.js': `const express = require('express');
const app = express();
const port = 4000;

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MODE = process.env.MODE || 'development';
const AUTH_KEY = process.env.AUTH_KEY || 'default-key';

app.get('/', (req, res) => {
  console.log(\`[\${LOG_LEVEL}] Handling request in \${MODE} mode\`);
  res.send(\`Auth Service Running. Mode: \${MODE}, Log Level: \${LOG_LEVEL}\`);
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(\`Auth service listening on port \${port}\`);
  console.log(\`Configuration: LOG_LEVEL=\${LOG_LEVEL}, MODE=\${MODE}\`);
  if (AUTH_KEY === 'default-key') {
      console.warn('Warning: Using default AUTH_KEY');
  } else {
      console.log('AUTH_KEY is set');
  }
});`,
      'Dockerfile': `FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]`,
      'ansible/templates/configmap.yml.j2': `apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-config
  namespace: auth-ns
data:
  LOG_LEVEL: "{{ log_level }}"
  MODE: "{{ mode }}"`,
      'ansible/templates/secret.yml.j2': `apiVersion: v1
kind: Secret
metadata:
  name: auth-secret
  namespace: auth-ns
type: Opaque
data:
  AUTH_KEY: "{{ auth_key | b64encode }}"`,
      'ansible/templates/deployment.yml.j2': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-deployment
  namespace: auth-ns
  labels:
    app: auth-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: "{{ image_name }}:{{ image_tag }}"
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 4000
        env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: auth-config
              key: LOG_LEVEL
        - name: MODE
          valueFrom:
            configMapKeyRef:
              name: auth-config
              key: MODE
        - name: AUTH_KEY
          valueFrom:
            secretKeyRef:
              name: auth-secret
              key: AUTH_KEY`,
      'ansible/templates/service.yml.j2': `apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: auth-ns
spec:
  selector:
    app: auth-service
  ports:
    - protocol: TCP
      port: 4000
      targetPort: 4000
  type: ClusterIP`,
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
    statement: `# Blue-Green Deployment Flow Using Ansible

## Objective
Implement a Blue-Green deployment strategy for a Go application (\`user-api\`) using Ansible and Kubernetes. This allows zero-downtime updates by switching traffic between two versions of the application.

## Prerequisites
- **Docker**: To build the application images.
- **Kubernetes Cluster**: A running cluster.
- **Ansible**: To orchestrate the deployment.

## Project Structure
\`\`\`
ansible-blue-green-go/
├── user-api/           # Go Application
│   ├── main.go
│   └── Dockerfile
└── ansible/            # Ansible Automation
    ├── blue_green_deploy.yml
    └── templates/
        ├── deployment.yml.j2
        └── service.yml.j2
\`\`\`

## Instructions

### 1. Application Setup
The \`user-api\` is a simple Go application that returns a color (blue or green) based on an environment variable.
- **Dockerfile**: Create a multi-stage Dockerfile to build the Go binary.

### 2. Ansible Playbook (\`blue_green_deploy.yml\`)
Create a playbook that performs the following:
1.  **Build Images**: Build Docker images for both "blue" and "green" versions.
2.  **Deploy Blue Version**:
    - Deploy the "blue" version of the app.
    - Wait for it to become ready.
3.  **Deploy Green Version**:
    - Deploy the "green" version of the app.
    - Wait for it to become ready.
4.  **Switch Traffic**:
    - Update the Kubernetes Service to point to the "green" deployment (active color).
    - Verify that the service now returns "green".

### 3. Verification
- Run the playbook: \`ansible-playbook blue_green_deploy.yml\`
- Check the service output: \`curl http://<service-ip>:8080\`
- It should return the color of the active deployment.`,
    solution: {
      'user-api/main.go': `package main

import (
        "fmt"
        "net/http"
        "os"
)

func main() {
        color := os.Getenv("COLOR")
        if color == "" {
                color = "unknown"
        }

        http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
                fmt.Fprintf(w, "I am the %s version\\n", color)
        })

        fmt.Printf("User API (%s) listening on port 8080\\n", color)
        http.ListenAndServe(":8080", nil)
}`,
      'user-api/Dockerfile': `FROM golang:1.19-alpine AS builder

WORKDIR /app
COPY main.go .
RUN go build -o user-api main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/user-api .

EXPOSE 8080
CMD ["./user-api"]`,
      'ansible/templates/deployment.yml.j2': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-api-{{ color }}
  labels:
    app: user-api
    version: {{ color }}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: user-api
      version: {{ color }}
  template:
    metadata:
      labels:
        app: user-api
        version: {{ color }}
    spec:
      containers:
      - name: user-api
        image: user-api-{{ color }}:v1
        imagePullPolicy: Never
        ports:
        - containerPort: 8080
        env:
        - name: COLOR
          value: "{{ color }}"`,
      'ansible/templates/service.yml.j2': `apiVersion: v1
kind: Service
metadata:
  name: user-api-service
spec:
  selector:
    app: user-api
    version: {{ active_color }}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP`,
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
    statement: `# Kubernetes NetworkPolicy + Multi-Tier App

## Objective
Secure a 3-tier application (Frontend, Backend, Database) using Kubernetes NetworkPolicies. The goal is to strictly control traffic flow between the tiers.

## Architecture
- **Frontend**: Nginx (NodePort Service) - Accessible from outside.
- **Backend**: Flask App (ClusterIP Service) - Accessible ONLY from Frontend.
- **Database**: Postgres (ClusterIP Service) - Accessible ONLY from Backend.

## Instructions

### 1. Deploy Components
Create Kubernetes manifests for:
- **Postgres**: Deployment, Service, Secret, PVC.
- **Backend**: Deployment, Service. Connects to Postgres using env vars.
- **Frontend**: Deployment, Service (NodePort). Proxies requests to Backend.

### 2. Implement Network Policies
Create a \`network-policies.yaml\` file to enforce the following rules:
1.  **Default Deny**: Deny all ingress traffic by default.
2.  **Allow Frontend -> Backend**: Allow traffic to the Backend *only* from the Frontend pods.
3.  **Allow Backend -> Database**: Allow traffic to the Database *only* from the Backend pods.
4.  **Allow External -> Frontend**: Allow external traffic to access the Frontend.

### 3. Verification
- Deploy all resources.
- Verify that the Frontend can access the Backend (and thus the DB).
- Verify that you *cannot* access the Database directly from a temporary pod (e.g., \`kubectl run busybox --image=busybox\`).`,
    solution: {
      'backend/app.py': `import os
import psycopg2
from flask import Flask

app = Flask(__name__)

DB_HOST = os.environ.get('DB_HOST', 'postgres')
DB_NAME = os.environ.get('POSTGRES_DB', 'postgres')
DB_USER = os.environ.get('POSTGRES_USER', 'postgres')
DB_PASS = os.environ.get('POSTGRES_PASSWORD', 'password')

@app.route('/')
def hello():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        conn.close()
        return "Connected to Database Successfully!"
    except Exception as e:
        return f"Database Connection Failed: {str(e)}"

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)`,
      'backend/Dockerfile': `FROM python:3.9-slim

WORKDIR /app

RUN pip install flask psycopg2-binary

COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]`,
      'postgres.yaml': `apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  labels:
    app: postgres
    tier: db
type: Opaque
data:
  # user: postgres, password: password
  POSTGRES_USER: cG9zdGdyZXM=
  POSTGRES_PASSWORD: cGFzc3dvcmQ=
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  labels:
    app: postgres
    tier: db
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  labels:
    app: postgres
    tier: db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
      tier: db
  template:
    metadata:
      labels:
        app: postgres
        tier: db
    spec:
      containers:
        - name: postgres
          image: postgres:13
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: postgres-secret
          volumeMounts:
            - mountPath: /var/lib/postgresql/data
              name: postgres-storage
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  labels:
    app: postgres
    tier: db
spec:
  selector:
    app: postgres
    tier: db
  ports:
    - protocol: TCP
      port: 5432
      targetPort: 5432`,
      'backend.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app: backend
    tier: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
      tier: backend
  template:
    metadata:
      labels:
        app: backend
        tier: backend
    spec:
      containers:
        - name: backend
          image: backend:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 5000
          env:
            - name: DB_HOST
              value: "postgres"
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  labels:
    app: backend
    tier: backend
spec:
  selector:
    app: backend
    tier: backend
  ports:
    - protocol: TCP
      port: 5000
      targetPort: 5000`,
      'frontend.yaml': `apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-conf
  labels:
    app: frontend
    tier: frontend
data:
  default.conf: |
    server {
        listen 80;
        location / {
            proxy_pass http://backend:5000;
        }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  labels:
    app: frontend
    tier: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
      tier: frontend
  template:
    metadata:
      labels:
        app: frontend
        tier: frontend
    spec:
      containers:
        - name: frontend
          image: nginx:alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: nginx-conf
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
      volumes:
        - name: nginx-conf
          configMap:
            name: nginx-conf
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  labels:
    app: frontend
    tier: frontend
spec:
  selector:
    app: frontend
    tier: frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: NodePort`,
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
**Challenge:** The Terraform configuration should AUTOMATICALLY build/push the image and configure the EC2 instance to run it.

## Prerequisites
- AWS Account
- Terraform installed
- Docker installed and running
- AWS CLI configured
- An EC2 Key Pair (default name: \`my-key-pair\`)

## Instructions

### 1. Application Setup
- Review \`app.py\` and \`Dockerfile\`.

### 2. Infrastructure as Code (Terraform)
Create a Terraform configuration (\`main.tf\`) that:
1.  Provisions ECR, IAM User, Policies, and EC2 Instance.
2.  **Automation 1**: Uses a \`null_resource\` with \`local-exec\` to:
    - Login to ECR.
    - Build the Docker image.
    - Push the Docker image to ECR.
3.  **Automation 2**: Configures the EC2 \`user_data\` script to:
    - Install Docker.
    - Login to ECR (using the Instance Profile).
    - Pull and Run the Docker image on startup.

### 3. Deployment
- Initialize: \`terraform init\`
- Apply: \`terraform apply\`
- Watch the logs! You should see Docker building and pushing during the apply process.

### 4. Verification
- Wait for the EC2 instance to finish initializing (status checks passed).
- Get the \`instance_public_ip\` from the outputs.
- Test the app: \`curl http://<instance_public_ip>:5000\`
- You should see the "Hello World" message.

### 5. Cleanup
- \`terraform destroy\``,
    solution: {
      'app.py': `import os

def main():
    print("Hello from AWS ECR Terraform Challenge!")
    print(f"Running in environment: {os.getenv('ENV', 'unknown')}")

if __name__ == "__main__":
    main()`,
      'Dockerfile': `FROM python:3.12-slim

WORKDIR /app

COPY app.py .

CMD ["python", "app.py"]`,
      'variables.tf': `variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "repo_name" {
  description = "Name of the ECR repository"
  default     = "my-python-app-repo"
}

variable "iam_user_name" {
  description = "Name of the IAM user for CI/CD"
  default     = "ecr-ci-user"
}

variable "key_name" {
  description = "Name of the EC2 Key Pair to allow SSH access"
  default     = "my-key-pair"
}`,
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
}`,
      'outputs.tf': `output "ecr_repository_url" {
  value = aws_ecr_repository.app_repo.repository_url
}

output "iam_access_key_id" {
  value = aws_iam_access_key.ci_user_key.id
}

output "iam_secret_access_key" {
  value     = aws_iam_access_key.ci_user_key.secret
  sensitive = true
}

output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.app_server.public_ip
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
    statement: `# Kubernetes - Implementing Pod Security Contexts

## Important instructions to the participants:
- Give the exact name for all the Docker and Ansible objects. If the specified name is misspelled, your efforts will be invalid.
- Give the exact file names with the extensions as mentioned in the problem statement.
- Create the files in the given path as mentioned in the problem statement. If files are not present in the expected directory, your efforts will be invalid.
- Ensure that all the Docker objects are in the running state.
- Don't leave the environment idle for more than 2 minutes. This may cause environment instance to get stopped automatically.
- Please refrain from installing any of the tools which are not defined in the problem statement.
- Do not modify the existing project setup or structure unless it is mentioned in the problem statement.

## Getting started
- A Flask Application is given in the path \`~/Desktop/Project/minihack-kubernetes-implementing_pod_security/Flask-Application\`.
- A \`setup.sh\` file is given in the path \`~/Desktop/Project/minihack-kubernetes-implementing_pod_security/\`.
- Run the \`setup.sh\` file to start the minikube cluster.

### 1. Dockerize the Flask Application
Create a \`Dockerfile\` in the \`Flask-Application\` directory with the following configurations:
- Use \`Python 3.12-slim\` as the base image
- Create a user \`appuser\` with no home directory and disabled password
- Set ownership of the application directory to \`appuser\`
- Install the required dependencies from \`requirements.txt\`
- Expose port \`5000\`
- Ensure the application runs as the user \`appuser\`

### 2. Create Kubernetes Namespaces
Create two Kubernetes namespaces named \`flaskapp-dev\` and \`flaskapp-prod\`.
- Configure the namespace \`flaskapp-dev\` with **baseline** pod security policy.
- Configure the namespace \`flaskapp-prod\` with **strict** pod security policy.

### 3. Create Development Deployment
Create a Kubernetes deployment file named \`flaskapp-deployment-dev.yml\` in the path \`~/Desktop/Project/minihack-kubernetes-implementing_pod_security/\` to create a Deployment object named \`flaskapp-deployment-dev\` under the namespace \`flaskapp-dev\` with the following specifications:
- Run **3 replicas** with label \`app: flask-app\`.
- Update the security context of the Pod as below:
    - Run as non-root user
    - Set group ID of any attached volumes to \`1000\`.
- Run a container named \`flaskapp-container\` with the image \`flask-app-image\` on port \`5000\`.
- Update the security context of the container as below:
    - Run the container process as user with ID \`1000\`.
    - Set the primary group for the container process with ID \`1000\`.
    - Drop all Linux capabilities except \`CHOWN\`, \`SETUID\`, \`SETGID\`.
    - Allow privilege escalations.

### 4. Create Development Service
Create a Kubernetes manifest file named \`flaskapp-service-dev.yml\` in the same directory to create a Service object named \`flaskapp-service-dev\` of type \`NodePort\` to expose the Flask application on the port \`30043\`.

### 5. Create Production Deployment
Create a Kubernetes manifest file named \`flaskapp-deployment-prod.yml\` in the same directory to create a Deployment object named \`flaskapp-deployment-prod\` in the namespace \`flaskapp-prod\` with the following specifications:
- Run **2 replicas** with label \`app: flask-app\`.
- Update the security context of the Pod as below:
    - Run as non-root user
    - Set group ID of any attached volumes to \`1000\`.
    - Set Seccomp profile to \`default\`.
- Run a container named \`flaskapp-container\` with the image \`flask-app-image\` on port \`5000\`.
- Update the security context of the deployment container as below:
    - Run the container process as user with ID \`10000\`.
    - Set the primary group for the container process with ID \`10000\`.
    - Drop **all** Linux capabilities.
    - Set container's root filesystem to **read-only**.
    - Restrict privilege escalations.

### 6. Create Production Service
Create a Kubernetes manifest file named \`flaskapp-service-prod.yml\` in the same directory to create a Service object named \`flaskapp-service-prod\` of type \`NodePort\` to expose the Flask application on the port \`30044\`.

### 7. Deploy and Verify
Run the manifest files to deploy the flask application in both the environments and check whether the flask application is running in both the environments in the specified port with the required security contexts.

> **Note:**
> - Ensure all security contexts are properly configured.
> - Ensure all the deployments and services are in running state before submission.`,
    solution: {
      'Flask-Application/app.py': `import os
from flask import Flask

app = Flask(__name__)

def _read_secret(secret_name):
    try:
        with open(secret_name, 'r') as f:
            return f.read().strip()
    except Exception:
        return None

@app.get("/")
def index():
    greeting = os.getenv("APP_GREETING") or _read_secret("/run/secrets/app_greeting") or "Welcome to my Flask application"
    return f'<html><head><title>Flask Welcome</title></head><body style="font-family: sans-serif; margin: 2rem;"><h1>{greeting}</h1></body></html>'

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)`,
      'Flask-Application/Dockerfile': `FROM python:3.12-slim

# Create a user appuser with no home directory and disabled password
RUN useradd -M -s /bin/false -p '*' appuser

WORKDIR /app

# Set ownership of the application directory to appuser
RUN chown -R appuser:appuser /app

# Install the required dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Expose port 5000
EXPOSE 5000

# Ensure the application runs as the user appuser
USER appuser

CMD ["python", "app.py"]`,
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
      'flaskapp-deployment-dev.yml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: flaskapp-deployment-dev
  namespace: flaskapp-dev
spec:
  replicas: 3
  selector:
    matchLabels:
      app: flask-app
  template:
    metadata:
      labels:
        app: flask-app
    spec:
      securityContext:
        runAsNonRoot: true
        fsGroup: 1000
      containers:
      - name: flaskapp-container
        image: flask-app-image
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 5000
        securityContext:
          runAsUser: 1000
          runAsGroup: 1000
          capabilities:
            drop:
            - ALL
            add:
            - CHOWN
            - SETUID
            - SETGID
          allowPrivilegeEscalation: true`,
      'flaskapp-service-dev.yml': `apiVersion: v1
kind: Service
metadata:
  name: flaskapp-service-dev
  namespace: flaskapp-dev
spec:
  type: NodePort
  selector:
    app: flask-app
  ports:
  - port: 30043
    targetPort: 5000
    nodePort: 30043`,
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
          allowPrivilegeEscalation: false`,
      'flaskapp-service-prod.yml': `apiVersion: v1
kind: Service
metadata:
  name: flaskapp-service-prod
  namespace: flaskapp-prod
spec:
  type: NodePort
  selector:
    app: flask-app
  ports:
  - port: 30044
    targetPort: 5000
    nodePort: 30044`
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
    statement: `# Secure Dockerfile + Read-Only Root Filesystem

## Objective
Containerize a Python script (\`processor.py\`) with strict security controls. The goal is to minimize the attack surface by running as a non-root user, enforcing a read-only root filesystem, and dropping unnecessary Linux capabilities.

## Requirements
1.  **Non-Root User**: Create and use a dedicated user (e.g., \`processor\`) inside the container.
2.  **Read-Only Filesystem**: The container must run with a read-only root filesystem.
3.  **Writable Volume**: Mount a volume at \`/data\` for the application to write its output.
4.  **Drop Capabilities**: Drop ALL Linux capabilities.

## Instructions

### 1. Application Script (\`processor.py\`)
The provided script writes a timestamp to \`/data/output.txt\`. It expects the \`/data\` directory to be writable.

### 2. Dockerfile
Create a \`Dockerfile\` that:
- Uses a slim Python base image.
- Creates a non-root user with a specific UID (e.g., 1000).
- Sets the working directory.
- Copies the script.
- Prepares the \`/data\` directory and assigns ownership to the non-root user.
- Switches to the non-root user.

### 3. Runtime Security
Run the container using Docker flags to enforce security:
- \`--read-only\`: Mount the root filesystem as read-only.
- \`--cap-drop=ALL\`: Drop all Linux capabilities.
- \`--user 1000:1000\`: Enforce running as the non-root user.
- \`-v $(pwd)/data:/data\`: Mount a local directory to \`/data\` for writing output.

### 4. Verification
- Build the image.
- Run the container with the security flags.
- Verify that \`data/output.txt\` is created on your host.
- Verify that the container cannot write to other locations (e.g., \`/app\`).`,
    solution: {
      'processor.py': `import os
import time

output_file = "/data/output.txt"
`,
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
    statement: `# Terraform + AWS Local Simulation (LocalStack)

## Objective
Build and deploy a serverless infrastructure (S3, DynamoDB, API Gateway, Lambda) using Terraform, but target a local AWS simulation environment (LocalStack) instead of real AWS.

## Prerequisites
- **LocalStack**: Running locally via Docker.
- **Terraform**: Installed.
- **Docker**: To run LocalStack.

## Architecture
- **S3 Bucket**: \`demo-bucket\`
- **DynamoDB Table**: \`users\` (Partition Key: \`id\`)
- **Lambda Function**: Writes to DynamoDB.
- **API Gateway**: Triggers the Lambda function.

## Instructions

### 1. Start LocalStack
Run LocalStack using Docker to simulate AWS services on localhost.

### 2. Terraform Configuration (\`main.tf\`)
Configure the AWS provider to point to LocalStack endpoints (\`http://localhost:4566\`) for all services (S3, DynamoDB, Lambda, APIGateway, IAM, STS).
Define the resources:
- \`aws_s3_bucket\`
- \`aws_dynamodb_table\`
- \`aws_lambda_function\` (zip the python code)
- \`aws_api_gateway_rest_api\` and related resources.

### 3. Lambda Function (\`lambda.py\`)
Write a Python Lambda function that accepts an event, extracts user data, and writes it to the DynamoDB table.

### 4. Deployment & Testing
- Initialize and Apply Terraform.
- Use \`curl\` to invoke the API Gateway endpoint exposed by LocalStack.
- Verify that the item is written to the DynamoDB table.`,
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
        }
`,
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
    statement: `# Helm Chart Creation for Microservice

## Objective
Create a reusable Helm chart for a Java Spring Boot application. The chart should allow users to configure key parameters like replica count, image repository, and service port via \`values.yaml\`.

## Requirements
Create a Helm chart structure with the following files:
1.  \`Chart.yaml\`: Metadata about the chart.
2.  \`values.yaml\`: Default configuration values.
3.  \`templates/deployment.yaml\`: Kubernetes Deployment manifest.
4.  \`templates/service.yaml\`: Kubernetes Service manifest.
5.  \`templates/configmap.yaml\`: ConfigMap for environment variables.

## Instructions

### 1. Define Values (\`values.yaml\`)
Define defaults for:
- \`replicaCount\`
- \`image\`: repository, tag, pullPolicy
- \`service\`: type, port
- \`config\`: logLevel

### 2. Create Templates
Use Go templating (\`{{ .Values.key }}\`) to inject values into the manifests.
- **Deployment**: Use values for replicas, image, and container port. Mount the ConfigMap as environment variables.
- **Service**: Use values for service type and port.
- **ConfigMap**: Inject the \`logLevel\` from values.

### 3. Deployment
- Package or install the chart directly using \`helm install\`.
- Verify that the resources are created with the specified values.`,
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
      'templates/configmap.yaml': `apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
data:
  LOG_LEVEL: {{ .Values.config.logLevel | quote }}`,
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
      targetPort: {{ .Values.service.port }}`
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
    statement: `# CI/CD Simulation Using Bash + Docker + K8s

## Objective
Simulate a local Continuous Integration and Continuous Deployment (CI/CD) pipeline using Bash scripts. This pipeline will automate the process of building a Docker image and updating a Kubernetes deployment.

## Components
1.  **Build Script (\`build.sh\`)**: Simulates the CI stage.
2.  **Deploy Script (\`deploy.sh\`)**: Simulates the CD stage.

## Instructions

### 1. Build Script (\`build.sh\`)
Write a script that takes an app name as an argument and:
1.  **Lints**: Simulates a linting step (e.g., \`echo "Linting..."\`).
2.  **Builds**: Builds a Docker image with a unique tag (e.g., using a timestamp).
3.  **Pushes**: Pushes the image to a registry (use \`localhost:5000\` or a mock).
4.  **Artifact**: Saves the generated image tag to a file (\`image_tag.txt\`) for the deploy script to use.

### 2. Deploy Script (\`deploy.sh\`)
Write a script that takes a deployment name as an argument and:
1.  **Reads Artifact**: Reads the image tag from \`image_tag.txt\`.
2.  **Updates Deployment**: Uses \`kubectl set image\` to update the specified deployment with the new image.
3.  **Rollout**: Triggers a rollout restart (\`kubectl rollout restart\`).
4.  **Wait**: Waits for the rollout to complete (\`kubectl rollout status\`).

### 3. Execution
- Run \`./build.sh my-app\`
- Run \`./deploy.sh my-deployment\`
- Verify that the Kubernetes deployment is updated with the new image tag.`,
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
    statement: `# Kubernetes Volume Permissions + fsGroup + Security

## Objective
Configure a Pod's security context to ensure it can correctly access and write to a mounted volume as a specific non-root user.

## Requirements
1.  **Pod Name**: \`volume-test\`
2.  **User ID**: The container must run as user ID \`2000\`.
3.  **Group ID**: The mounted volume must be owned by group ID \`2000\` (\`fsGroup\`).
4.  **Volume**: Mount an \`emptyDir\` volume at \`/data\`.

## Instructions

### 1. Create Pod Manifest (\`pod.yaml\`)
Define a Pod that:
- Uses the \`busybox\` image.
- Runs a command to keep it alive (e.g., \`sleep 3600\`).
- Defines a \`securityContext\` at the Pod level:
    - \`runAsUser: 2000\`
    - \`fsGroup: 2000\`
- Mounts an \`emptyDir\` volume named \`data-volume\` to \`/data\`.

### 2. Verification
- Apply the manifest: \`kubectl apply -f pod.yaml\`
- Wait for the pod to run.
- Exec into the pod: \`kubectl exec -it volume-test -- sh\`
- Check the ownership of the \`/data\` directory: \`ls -ld /data\`
- It should show the user and group as \`2000\`.`,
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
  },
  {
    id: 'k8s-hpa',
    title: 'Kubernetes HPA CPU Scaling',
    description: 'Implement Horizontal Pod Autoscaler based on CPU usage.',
    statement: `# Kubernetes HPA CPU Scaling

## Objective
Implement a Horizontal Pod Autoscaler (HPA) to automatically scale a Deployment based on CPU utilization.

## Requirements
1.  **Deployment**: Create a deployment named \`php-apache\`.
2.  **Resources**: The container MUST request CPU resources (e.g., \`200m\`) for HPA to work.
3.  **HPA**: Configure HPA to scale between 1 and 10 replicas when CPU usage exceeds 50%.

## Instructions

### 1. Deployment (\`deployment.yaml\`)
Create a deployment using the \`k8s.gcr.io/hpa-example\` image.
- **Important**: Define resource requests:
  \`\`\`yaml
  resources:
    requests:
      cpu: 200m
  \`\`\`
- Expose port 80.

### 2. Service
Create a Service to expose the deployment (optional for HPA but good practice).

### 3. Horizontal Pod Autoscaler (\`hpa.yaml\`)
Create an HPA resource that:
- Targets the \`php-apache\` deployment.
- Sets \`minReplicas: 1\`.
- Sets \`maxReplicas: 10\`.
- Sets \`targetCPUUtilizationPercentage: 50\`.

### 4. Verification
- Apply the resources.
- Run a load generator (e.g., \`busybox\` loop hitting the service).
- Watch the HPA: \`kubectl get hpa -w\`.
- Observe the replica count increasing as load increases.`,
    solution: {
      'deployment.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: php-apache
spec:
  selector:
    matchLabels:
      run: php-apache
  replicas: 1
  template:
    metadata:
      labels:
        run: php-apache
    spec:
      containers:
      - name: php-apache
        image: k8s.gcr.io/hpa-example
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: 500m
          requests:
            cpu: 200m
---
apiVersion: v1
kind: Service
metadata:
  name: php-apache
  labels:
    run: php-apache
spec:
  ports:
  - port: 80
  selector:
    run: php-apache`,
      'hpa.yaml': `apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: php-apache
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: php-apache
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 50`
    },
    explanation: 'The Horizontal Pod Autoscaler automatically scales the number of pods in a replication controller, deployment, replica set or stateful set based on observed CPU utilization. Here, we define a target of 50% CPU utilization. If the average CPU usage across all pods exceeds this, K8s will add more replicas up to 10.',
    howToRun: `1. Apply deployment and service:
   \`\`\`bash
   kubectl apply -f deployment.yaml
   \`\`\`
2. Apply HPA:
   \`\`\`bash
   kubectl apply -f hpa.yaml
   \`\`\`
3. Generate load (in another terminal):
   \`\`\`bash
   kubectl run -i --tty load-generator --image=busybox /bin/sh
   # Inside container:
   while true; do wget -q -O- http://php-apache; done
   \`\`\`
4. Watch scaling:
   \`\`\`bash
   kubectl get hpa -w
   \`\`\``
  },
  {
    id: 'docker-multistage',
    title: 'Docker Multi-Stage Build',
    description: 'Optimize Go App Image Size using multi-stage builds.',
    statement: `# Docker Multi-Stage Build

## Objective
Optimize the size of a Go application Docker image using multi-stage builds. The final image should contain *only* the compiled binary, not the source code or build tools.

## Requirements
1.  **App**: A simple Go "Hello World" application.
2.  **Builder Stage**: Use \`golang:1.21\` to compile the app.
3.  **Final Stage**: Use \`alpine:latest\` as the runtime image.
4.  **Size**: The final image should be significantly smaller than the builder image (aim for < 20MB).

## Instructions

### 1. Go Application (\`main.go\`)
Create a simple \`main.go\` that prints "Hello, World!".

### 2. Dockerfile
Create a \`Dockerfile\` with two stages:
- **Stage 1 (Builder)**:
    - Base: \`golang:1.21\`
    - Copy source.
    - Build static binary: \`CGO_ENABLED=0 GOOS=linux go build -o myapp .\`
- **Stage 2 (Final)**:
    - Base: \`alpine:latest\`
    - Copy the binary \`myapp\` from the Builder stage.
    - Set the command to run \`./myapp\`.

### 3. Verification
- Build the image: \`docker build -t go-app .\`
- Check the size: \`docker images | grep go-app\`
- Run the container to ensure it works.`,
    solution: {
      'main.go': `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}`,
      'Dockerfile': `# Stage 1: Builder
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o myapp .

# Stage 2: Final Image
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/myapp .
CMD ["./myapp"]`
    },
    explanation: 'Multi-stage builds allow you to drastically reduce the size of your final Docker image. The first stage contains all the build tools (Go compiler, etc.) needed to create the binary. The second stage is a minimal runtime environment (Alpine Linux) where we copy only the compiled binary. This discards all the build artifacts and tools, resulting in a secure and lightweight image.',
    howToRun: `1. Build the image:
   \`\`\`bash
   docker build -t go-app .
   \`\`\`
2. Check size:
   \`\`\`bash
   docker images | grep go-app
   \`\`\`
3. Run it:
   \`\`\`bash
   docker run --rm go-app
   \`\`\``
  },
  {
    id: 'ansible-nginx-role',
    title: 'Ansible Nginx Role',
    description: 'Create a reusable Ansible Role to configure Nginx.',
    statement: `# Ansible Nginx Role

## Objective
Create a reusable Ansible Role to install and configure Nginx. This promotes code reuse and modularity in your Ansible playbooks.

## Requirements
1.  **Role Structure**: Create the standard directory structure for a role named \`nginx\`.
2.  **Tasks**:
    - Install Nginx package.
    - Start and enable the Nginx service.
    - Deploy a custom \`index.html\`.
3.  **Playbook**: Create a \`site.yml\` to apply the role.

## Instructions

### 1. Role Creation
Create directories: \`roles/nginx/tasks\` and \`roles/nginx/templates\`.

### 2. Template (\`index.html.j2\`)
Create a Jinja2 template for \`index.html\` that uses a variable (e.g., \`{{ ansible_hostname }}\`).

### 3. Tasks (\`roles/nginx/tasks/main.yml\`)
Define the tasks:
- Use \`yum\` or \`apt\` module to install \`nginx\`.
- Use \`service\` module to start \`nginx\`.
- Use \`template\` module to copy \`index.html.j2\` to \`/usr/share/nginx/html/index.html\`.

### 4. Playbook (\`site.yml\`)
Create a playbook that targets a host (e.g., \`web\`) and includes the \`nginx\` role.

### 5. Verification
- Run the playbook.
- Verify Nginx is running on the target host.
- Verify the custom index page is served.`,
    solution: {
      'roles/nginx/templates/index.html.j2': `<h1>Hello from {{ ansible_hostname }}</h1>
<p>Managed by Ansible Role</p>`,
      'roles/nginx/tasks/main.yml': `---
- name: Install Nginx
  yum:
    name: nginx
    state: present

- name: Start Nginx
  service:
    name: nginx
    state: started
    enabled: yes

- name: Deploy index.html
  template:
    src: index.html.j2
    dest: /usr/share/nginx/html/index.html
  notify: Restart Nginx`,
      'site.yml': `---
- hosts: web
  become: yes
  roles:
    - nginx`
    },
    explanation: 'Ansible Roles allow you to organize your automation into reusable units. This role encapsulates all the tasks and templates needed to set up Nginx. The `site.yml` playbook simply calls this role, making the top-level configuration clean and readable.',
    howToRun: `1. Run the playbook (assuming 'web' host is configured):
   \`\`\`bash
   ansible-playbook -i inventory site.yml
   \`\`\`
   (Note: You need a valid inventory file and target host)`
  },
  {
    id: 'terraform-s3-module',
    title: 'Terraform S3 Module',
    description: 'Create a reusable Terraform module for S3 buckets.',
    statement: `# Terraform S3 Module

## Objective
Create a reusable Terraform module for provisioning S3 buckets with enforced configurations (e.g., versioning enabled).

## Requirements
1.  **Module**: Create a module in \`modules/s3\`.
2.  **Resources**: The module must create an \`aws_s3_bucket\` and \`aws_s3_bucket_versioning\`.
3.  **Inputs**: The module must accept \`bucket_name\` as a variable.
4.  **Usage**: Call the module from the root \`main.tf\`.

## Instructions

### 1. Module Definition (\`modules/s3\`)
- **\`variables.tf\`**: Define \`bucket_name\`.
- **\`main.tf\`**:
    - Create \`aws_s3_bucket\` using \`var.bucket_name\`.
    - Create \`aws_s3_bucket_versioning\` linked to the bucket, with \`status = "Enabled"\`.

### 2. Root Configuration (\`main.tf\`)
- Configure the AWS provider.
- Call the module:
  \`\`\`hcl
  module "my_bucket" {
    source      = "./modules/s3"
    bucket_name = "my-unique-bucket-name"
  }
  \`\`\`

### 3. Verification
- Run \`terraform init\`.
- Run \`terraform plan\` to verify that the module resources (bucket + versioning) will be created.`,
    solution: {
      'modules/s3/variables.tf': `variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}`,
      'modules/s3/main.tf': `resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = "Enabled"
  }
}`,
      'main.tf': `provider "aws" {
  region = "us-east-1"
}

module "my_bucket" {
  source      = "./modules/s3"
  bucket_name = "my-unique-bucket-name-12345"
}`
    },
    explanation: 'Modules are the primary way to package and reuse resource configurations in Terraform. By creating a dedicated S3 module, we can enforce standards (like always enabling versioning) and easily create multiple consistent buckets by simply calling the module with different parameters.',
    howToRun: `1. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`
2. Plan the deployment:
   \`\`\`bash
   terraform plan
   \`\`\`
3. Apply:
   \`\`\`bash
   terraform apply
   \`\`\``
  },
  {
    id: 'k8s-ingress',
    title: 'Kubernetes Ingress Routing',
    description: 'Configure Path-Based Ingress Routing.',
    statement: `# Kubernetes Ingress Routing

## Objective
Configure an Ingress resource to route traffic to different services based on the URL path (Fanout).

## Requirements
1.  **Host**: \`foo.bar.com\`
2.  **Paths**:
    - \`/foo\` -> Routes to \`service1\` on port \`4200\`.
    - \`/bar\` -> Routes to \`service2\` on port \`8080\`.
3.  **Path Type**: Use \`Prefix\`.

## Instructions

### 1. Ingress Manifest (\`ingress.yaml\`)
Create an Ingress resource named \`simple-fanout-example\`.
- **Annotations**: Add rewrite annotation if needed (e.g., for Nginx ingress).
- **Rules**:
    - Define host \`foo.bar.com\`.
    - Define \`http\` paths.
    - Path \`/foo\`: backend \`service1\`.
    - Path \`/bar\`: backend \`service2\`.

### 2. Verification
- Apply the ingress.
- Verify it is created: \`kubectl get ingress\`.
- (Optional) If you have an Ingress Controller, test with \`curl -H "Host: foo.bar.com" http://<ingress-ip>/foo\`.`,
    solution: {
      'ingress.yaml': `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: simple-fanout-example
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: foo.bar.com
    http:
      paths:
      - path: /foo
        pathType: Prefix
        backend:
          service:
            name: service1
            port:
              number: 4200
      - path: /bar
        pathType: Prefix
        backend:
          service:
            name: service2
            port:
              number: 8080`
    },
    explanation: 'Ingress exposes HTTP and HTTPS routes from outside the cluster to services within the cluster. Traffic routing is controlled by rules defined on the Ingress resource. This example demonstrates "fanout" routing, where a single IP address (and host) routes traffic to different services based on the requested URL path.',
    howToRun: `1. Apply the ingress:
   \`\`\`bash
   kubectl apply -f ingress.yaml
   \`\`\`
2. Verify:
   \`\`\`bash
   kubectl get ingress
   \`\`\`
   (Note: You need an Ingress Controller like Nginx installed in your cluster for this to work)`
  },
  {
    id: 'flask-ec2-terraform',
    title: 'Flask App Deployment to EC2 with Terraform (ECR)',
    description: 'Build Docker image, push to ECR, and deploy to EC2 using Terraform and LocalStack.',
    statement: `# Flask App Deployment on LocalStack with Terraform (ECR)

This project demonstrates how to deploy a Dockerized Flask application to an AWS EC2 instance using Terraform, simulating the environment locally with LocalStack.

## Architecture

The architecture includes an AWS ECR repository for storing Docker images.

1.  **Build & Push**: Terraform \`local-exec\` builds the Docker image locally and pushes it to the LocalStack ECR repository.
2.  **Provision**: Terraform provisions an EC2 instance with an IAM role allowing ECR access.
3.  **Deploy**: The EC2 instance \`user_data\` pulls the image from ECR and runs it.

![Architecture Diagram](architecture.png)

## Prerequisites

- [Docker](https://www.docker.com/)
- [Terraform](https://www.terraform.io/)
- [AWS CLI](https://aws.amazon.com/cli/)
- \`awslocal\` (optional)

## Project Structure

- \`app.py\`: Simple Flask application.
- \`Dockerfile\`: Docker configuration (runs as non-root user).
- \`main.tf\`: Terraform configuration for ECR, IAM, EC2, SG, and Key Pair.
- \`provider.tf\`: Terraform AWS provider configured for LocalStack.

## How to Run

### 1. Start LocalStack

\`\`\`bash
docker run -d --rm -p 4566:4566 -p 4510-4559:4510-4559 -v /var/run/docker.sock:/var/run/docker.sock --name localstack-main localstack/localstack
\`\`\`

### 2. Initialize Terraform

\`\`\`bash
terraform init
\`\`\`

### 3. Deploy Infrastructure

\`\`\`bash
terraform apply
\`\`\`

### 4. Verify Deployment

Terraform will output the \`app_url\` and \`ecr_repository_url\`.

\`\`\`bash
# Verify ECR repository
docker exec localstack-main awslocal ecr describe-repositories
\`\`\`

### 5. Clean Up

\`\`\`bash
terraform destroy
\`\`\``,
    solution: {
      'app.py': `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)`,
      'Dockerfile': `FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Create a non-root user and switch to it
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

CMD ["python", "app.py"]`,
      'provider.tf': `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    ec2 = "http://localhost:4566"
  }
}`,
      'main.tf': `# 1. IAM Role for EC2 to access ECR
resource "aws_iam_role" "ec2_ecr_role" {
  name = "ec2_ecr_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  role       = aws_iam_role.ec2_ecr_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2_profile"
  role = aws_iam_role.ec2_ecr_role.name
}

# 2. ECR Repository
resource "aws_ecr_repository" "flask_app_repo" {
  name                 = "flask-app-repo"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

# 3. Security Group
resource "aws_security_group" "flask_sg" {
  name        = "flask_sg"
  description = "Allow HTTP and SSH traffic"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. Build and Push Docker Image
resource "null_resource" "docker_build_push" {
  triggers = {
    always_run = "\${timestamp()}"
  }

  provisioner "local-exec" {
    command = <<EOF
      docker run --rm -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test amazon/aws-cli --endpoint-url=http://host.docker.internal:4566 ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin \${aws_ecr_repository.flask_app_repo.repository_url}
      docker build -t \${aws_ecr_repository.flask_app_repo.repository_url}:latest .
      docker push \${aws_ecr_repository.flask_app_repo.repository_url}:latest
    EOF
  }
}

# 5. EC2 Instance
resource "aws_instance" "app_server" {
  ami                  = "ami-0cff7528ff583bf9a"
  instance_type        = "t2.micro"
  security_groups      = [aws_security_group.flask_sg.name]
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  depends_on = [null_resource.docker_build_push]

  user_data = <<EOF
#!/bin/bash
sudo yum update -y
sudo amazon-linux-extras install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user
aws --endpoint-url=http://localhost:4566 ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin \${aws_ecr_repository.flask_app_repo.repository_url}
docker pull \${aws_ecr_repository.flask_app_repo.repository_url}:latest
docker run -d -p 5000:5000 \${aws_ecr_repository.flask_app_repo.repository_url}:latest
EOF

  tags = {
    Name = "FlaskEC2Instance"
  }
}`,
      'outputs.tf': `output "app_url" {
  value = "http://\${aws_instance.app_server.public_ip}:5000"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.flask_app_repo.repository_url
}`
    },
    explanation: 'This solution uses Terraform to provision an ECR repository and an EC2 instance on LocalStack. It uses `local-exec` to build and push the Docker image to ECR. The EC2 instance is configured with an IAM role to pull the image from ECR and run it using `user_data`.',
    howToRun: `1. Start LocalStack:
   \`\`\`bash
   docker run -d --rm -p 4566:4566 -p 4510-4559:4510-4559 -v /var/run/docker.sock:/var/run/docker.sock --name localstack-main localstack/localstack
   \`\`\`
2. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`
3. Apply Configuration:
   \`\`\`bash
   terraform apply
   \`\`\``
  }
];
