terraform {
  backend "s3" {
    encrypt = "true"
    bucket = "sla-terraform"
    key = "ad-data-services.tfstate"
    region = "us-east-1"
  }
}
