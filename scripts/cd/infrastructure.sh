#
# Deploy infrastructure
#
# Usage:
#
#   ./scripts/cd/infrastructure.sh
#

kubectl apply -f rabbit.yaml
kubectl apply -f mongodb.yaml

az login
az aks get-credentials --resource-group deakinuni --name chapter10demo --overwrite-existing