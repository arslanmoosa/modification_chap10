#
# Deploys a microservice to Kubernetes.
#
# Assumes the image has already been built and published to the container registry.
#
# Environment variables:
#
#   CONTAINER_REGISTRY - The hostname of your container registry.
#   NAME - The name of the microservice to deploy.
#   VERSION - The version of the microservice being deployed.
#
# Usage:
#
#   ./scripts/cd/deploy.sh
#

set -u # or set -o nounset
: "$CONTAINER_REGISTRY"
: "$NAME"
: "$VERSION"

az login
az aks get-credentials --resource-group deakinuni --name chapter10demo --overwrite-existing
envsubst < ./scripts/cd/${NAME}.yaml | kubectl apply -f -
echo "waiting 20 seconds for ips generation"
sleep 20
POD_NAME=$(kubectl get pods --no-headers -o custom-columns=":metadata.name" | head -n 1)

# Display the generated pod name
echo "Generated pod name: $POD_NAME"

# Fetch and display logs of the pod
echo "Fetching logs for pod: $POD_NAME"
kubectl logs $POD_NAME
kubectl get deployment
kubectl get services