#include "common_header.h"

char* malloc_copy(char* input)
{
    char* result = (char*)malloc(1024);
    if (result == NULL) {
        return NULL;
    }

    strncpy(result, input, strlen(input));

    return result;
}

void malloc_free(char* input)
{
    free(input);
}

float my_sin(float val) 
{
    return sinf(val);
}
